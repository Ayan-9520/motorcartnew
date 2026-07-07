import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  enqueueMessage,
  mergeWhatsappArchitecture,
  readWhatsappArchitecture,
} from "@/lib/growth/whatsapp/architecture-store";
import { listWhatsappProviders, sendViaProvider } from "@/lib/growth/whatsapp/providers";
import type { WhatsappProviderId } from "@/lib/growth/whatsapp/types";

export function getWhatsappArchitectureConfig() {
  return {
    live_api_enabled: false,
    credentials_required: false,
    billing_enabled: false,
    providers: listWhatsappProviders(),
    queue: { backend: "workspace_metadata", max_items: 500 },
    template_approval: { flow: "draft → pending_provider → approved | rejected" },
    opt_in: { required: true, storage: "workspace_metadata" },
    delivery_tracking: { storage: "workspace_metadata + growth_message_logs" },
  };
}

async function loadWorkspace(workspaceId: string) {
  return prisma.growthWorkspace.findFirst({
    where: { id: workspaceId, status: { not: "archived" } },
  });
}

async function persistArchitecture(workspaceId: string, arch: ReturnType<typeof readWhatsappArchitecture>) {
  const ws = await loadWorkspace(workspaceId);
  if (!ws) return null;
  const metadata = mergeWhatsappArchitecture(ws.metadata, arch);
  return prisma.growthWorkspace.update({
    where: { id: workspaceId },
    data: { metadata: metadata as Prisma.InputJsonValue },
  });
}

export async function getWorkspaceWhatsappArchitecture(workspaceId: string) {
  const ws = await loadWorkspace(workspaceId);
  if (!ws) return null;
  return readWhatsappArchitecture(ws.metadata);
}

export async function setActiveWhatsappProvider(workspaceId: string, provider: WhatsappProviderId) {
  const ws = await loadWorkspace(workspaceId);
  if (!ws) return null;
  const arch = readWhatsappArchitecture(ws.metadata);
  return persistArchitecture(workspaceId, { ...arch, active_provider: provider });
}

export async function listWhatsappQueue(workspaceId: string) {
  const arch = await getWorkspaceWhatsappArchitecture(workspaceId);
  if (!arch) return null;
  return arch.queue;
}

export async function enqueueWhatsappMessage(
  workspaceId: string,
  data: { phone: string; body?: string; template_key?: string; provider?: WhatsappProviderId }
) {
  const ws = await loadWorkspace(workspaceId);
  if (!ws) return null;
  const arch = readWhatsappArchitecture(ws.metadata);
  const provider = data.provider ?? arch.active_provider;
  const next = enqueueMessage(arch, {
    workspace_id: workspaceId,
    provider,
    phone: data.phone,
    body: data.body ?? null,
    template_key: data.template_key ?? null,
  });
  await persistArchitecture(workspaceId, next);
  return next.queue[0] ?? null;
}

/** Process queue head — stub provider send, no external HTTP */
export async function processWhatsappQueueStub(workspaceId: string, limit = 10) {
  const ws = await loadWorkspace(workspaceId);
  if (!ws) return null;

  let arch = readWhatsappArchitecture(ws.metadata);
  const pending = arch.queue.filter((q) => q.status === "queued").slice(0, limit);
  const now = new Date().toISOString();

  for (const item of pending) {
    const result = await sendViaProvider(item.provider, {
      phone: item.phone,
      body: item.body ?? "",
      templateKey: item.template_key,
    });
    const messageId = randomUUID();
    arch = {
      ...arch,
      queue: arch.queue.map((q) =>
        q.id === item.id
          ? { ...q, status: result.status, updated_at: now }
          : q
      ),
      deliveries: {
        ...arch.deliveries,
        [messageId]: {
          message_id: messageId,
          provider: result.provider,
          status: result.status,
          events: [
            { status: "queued", at: item.created_at },
            { status: result.status, at: now, note: "stub_provider" },
          ],
        },
      },
    };
  }

  await persistArchitecture(workspaceId, arch);
  return { processed: pending.length, deliveries: arch.deliveries };
}

export async function recordWhatsappOptIn(
  workspaceId: string,
  data: { phone: string; source?: string }
) {
  const ws = await loadWorkspace(workspaceId);
  if (!ws) return null;
  const arch = readWhatsappArchitecture(ws.metadata);
  const phone = data.phone.trim();
  const filtered = arch.opt_ins.filter((o) => o.phone !== phone);
  const record = {
    phone,
    opted_in_at: new Date().toISOString(),
    source: data.source ?? "api",
    revoked_at: null,
  };
  await persistArchitecture(workspaceId, {
    ...arch,
    opt_ins: [record, ...filtered].slice(0, 5000),
  });
  return record;
}

export async function getTemplateApproval(workspaceId: string, templateId: string) {
  const template = await prisma.growthWhatsappTemplate.findFirst({
    where: { id: templateId, workspaceId },
  });
  if (!template) return null;

  const ws = await loadWorkspace(workspaceId);
  if (!ws) return null;
  const arch = readWhatsappArchitecture(ws.metadata);
  const cached = arch.template_approvals[templateId];
  if (cached) return cached;

  const approval = {
    template_id: templateId,
    provider: arch.active_provider,
    status: template.status === "approved" ? ("approved" as const) : ("draft" as const),
    external_ref: null,
    submitted_at: null,
    approved_at: template.status === "approved" ? template.updatedAt.toISOString() : null,
  };
  return approval;
}

export async function submitTemplateForApproval(workspaceId: string, templateId: string) {
  const template = await prisma.growthWhatsappTemplate.findFirst({
    where: { id: templateId, workspaceId },
  });
  if (!template) return null;

  const ws = await loadWorkspace(workspaceId);
  if (!ws) return null;
  const arch = readWhatsappArchitecture(ws.metadata);
  const approval = {
    template_id: templateId,
    provider: arch.active_provider,
    status: "pending_provider" as const,
    external_ref: `stub_ref_${template.templateKey}`,
    submitted_at: new Date().toISOString(),
    approved_at: null,
  };
  await persistArchitecture(workspaceId, {
    ...arch,
    template_approvals: { ...arch.template_approvals, [templateId]: approval },
  });
  return approval;
}

export function getDeliveryRecord(
  arch: ReturnType<typeof readWhatsappArchitecture>,
  messageId: string
) {
  return arch.deliveries[messageId] ?? null;
}
