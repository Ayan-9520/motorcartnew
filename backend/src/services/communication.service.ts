import { prisma } from "@/lib/prisma";
import { CommosError } from "@/lib/commos/errors";
import { hmacValid, maskRecipient, sha256 } from "@/lib/commos/crypto";
import { hourInIndia, inQuietHours } from "@/lib/commos/policy";
import type { CommActor } from "@/lib/commos/http";
import { isAdminRole, isDealerRole } from "@/lib/commos/http";
import { organizationForDealer, requireDealerContext, requireLeadForDealer } from "@/lib/sales-os/access";
import { createCrmActivity } from "@/services/sales-crm.service";

export function publicProvider(row: {
  id: string;
  name: string;
  channel: string;
  kind: string;
  environment: string;
  status: string;
  senderId: string | null;
  secretHash: string | null;
  credentialsRef: string | null;
}) {
  return {
    id: row.id,
    name: row.name,
    channel: row.channel,
    kind: row.kind,
    environment: row.environment,
    status: row.status,
    senderId: row.senderId,
    configured: Boolean(row.secretHash),
    credentialsRef: row.credentialsRef,
  };
}

export async function upsertProvider(
  actor: CommActor,
  input: {
    id?: string;
    organizationId?: string;
    name: string;
    channel: string;
    kind: string;
    secret?: string;
    webhookSecret?: string;
    senderId?: string;
    status?: string;
    credentialsRef?: string;
  },
) {
  if (!isAdminRole(actor.role)) throw new CommosError("Forbidden", 403, "FORBIDDEN");
  const data = {
    name: input.name,
    channel: input.channel.toUpperCase(),
    kind: input.kind.toUpperCase(),
    organizationId: input.organizationId,
    senderId: input.senderId,
    status: input.status ?? (input.secret ? "ACTIVE" : "DISABLED"),
    credentialsRef: input.credentialsRef ?? (input.secret ? "server" : null),
    secretHash: input.secret ? sha256(input.secret) : undefined,
    webhookSecretHash: input.webhookSecret ? sha256(input.webhookSecret) : undefined,
  };
  const row = input.id
    ? await prisma.communicationProvider.update({ where: { id: input.id }, data })
    : await prisma.communicationProvider.create({ data });
  return publicProvider(row);
}

export async function listProviders(actor: CommActor, organizationId?: string) {
  if (!isAdminRole(actor.role) && !isDealerRole(actor.role)) throw new CommosError("Forbidden", 403, "FORBIDDEN");
  const rows = await prisma.communicationProvider.findMany({
    where: organizationId ? { organizationId } : {},
    orderBy: { createdAt: "desc" },
  });
  return rows.map(publicProvider);
}

async function activeProvider(channel: string, organizationId?: string | null) {
  return prisma.communicationProvider.findFirst({
    where: {
      channel,
      status: "ACTIVE",
      secretHash: { not: null },
      ...(organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

async function assertConsent(channel: string, leadId?: string | null, userId?: string | null) {
  const map: Record<string, string> = { WHATSAPP: "WHATSAPP", SMS: "SMS", EMAIL: "EMAIL", TELEPHONY: "PHONE", IN_APP: "IN_APP" };
  const c = map[channel];
  if (!c || c === "IN_APP") return;
  const row = await prisma.customerConsent.findFirst({
    where: {
      channel: c,
      status: "GRANTED",
      withdrawnAt: null,
      OR: [...(leadId ? [{ leadId }] : []), ...(userId ? [{ userId }] : [])],
    },
  });
  if (!row) throw new CommosError("Consent required", 403, "CONSENT_REQUIRED");
}

async function assertPolicy(organizationId: string | null | undefined, leadId: string | null | undefined, channel: string) {
  if (!organizationId) return;
  const policy = await prisma.communicationPolicy.findUnique({ where: { organizationId } });
  const quietStart = policy?.quietStartHour ?? 21;
  const quietEnd = policy?.quietEndHour ?? 8;
  const max = policy?.maxOutboundPerDay ?? 8;
  const cooldown = policy?.cooldownMinutes ?? 120;
  if (inQuietHours(hourInIndia(), quietStart, quietEnd)) {
    throw new CommosError("Quiet hours — message deferred", 403, "QUIET_HOURS");
  }
  if (leadId) {
    const since = new Date(Date.now() - 86400000);
    const count = await prisma.communicationMessage.count({
      where: { leadId, channel, direction: "OUTBOUND", createdAt: { gte: since }, status: { not: "FAILED" } },
    });
    if (count >= max) throw new CommosError("Frequency limit reached", 429, "FREQUENCY_LIMIT");
    const last = await prisma.communicationMessage.findFirst({
      where: { leadId, channel, direction: "OUTBOUND" },
      orderBy: { createdAt: "desc" },
    });
    if (last && Date.now() - last.createdAt.getTime() < cooldown * 60_000) {
      throw new CommosError("Cooldown active", 429, "COOLDOWN");
    }
  }
}

export async function sendOutbound(
  actor: CommActor,
  input: {
    channel: string;
    leadId: string;
    content?: string;
    templateId?: string;
    templateApproved?: boolean;
  },
) {
  if (!isDealerRole(actor.role) && !isAdminRole(actor.role)) throw new CommosError("Forbidden", 403, "FORBIDDEN");
  const channel = input.channel.toUpperCase();
  const dealer = await requireDealerContext(actor);
  const lead = await requireLeadForDealer(dealer.id, input.leadId);
  const org = await organizationForDealer(dealer.id);
  const channelConsent = channel === "WHATSAPP" ? "WHATSAPP" : channel === "SMS" ? "SMS" : channel === "EMAIL" ? "EMAIL" : "PHONE";
  const latestConsent = await prisma.customerConsent.findFirst({
    where: { leadId: lead.id, channel: channelConsent },
    orderBy: { capturedAt: "desc" },
  });
  if (latestConsent?.status === "WITHDRAWN") throw new CommosError("Consent withdrawn", 403, "CONSENT_WITHDRAWN");
  await assertConsent(channel, lead.id, lead.customerUserId);
  await assertPolicy(org?.id, lead.id, channel);
  if (input.templateId && !input.templateApproved) {
    throw new CommosError("Template is not approved", 400, "TEMPLATE_NOT_APPROVED");
  }
  const provider = await activeProvider(channel, org?.id);
  const thread =
    (await prisma.communicationThread.findFirst({
      where: { leadId: lead.id, channel, dealerId: dealer.id },
    })) ??
    (await prisma.communicationThread.create({
      data: {
        channel,
        leadId: lead.id,
        dealerId: dealer.id,
        organizationId: org?.id,
        customerUserId: lead.customerUserId,
      },
    }));

  if (!provider) {
    const msg = await prisma.communicationMessage.create({
      data: {
        threadId: thread.id,
        channel,
        direction: "OUTBOUND",
        leadId: lead.id,
        dealerId: dealer.id,
        organizationId: org?.id,
        actorUserId: actor.userId,
        recipientMasked: maskRecipient(lead.phone),
        content: input.content,
        templateId: input.templateId,
        status: "FAILED",
        failedAt: new Date(),
        failureReason: "Provider not configured",
      },
    });
    throw new CommosError("Provider not configured", 403, "PROVIDER_NOT_CONFIGURED");
  }

  const providerMessageId = `test_${sha256(`${thread.id}:${Date.now()}`).slice(0, 16)}`;
  const msg = await prisma.communicationMessage.create({
    data: {
      threadId: thread.id,
      channel,
      direction: "OUTBOUND",
      leadId: lead.id,
      dealerId: dealer.id,
      organizationId: org?.id,
      actorUserId: actor.userId,
      providerId: provider.id,
      providerMessageId,
      recipientMasked: maskRecipient(lead.phone),
      content: input.content,
      templateId: input.templateId,
      templateApproved: Boolean(input.templateApproved),
      status: "SENT",
      sentAt: new Date(),
    },
  });
  await createCrmActivity(actor, {
    leadId: lead.id,
    activityType: "NOTE",
    subject: `${channel} message queued/sent`,
    notes: input.content?.slice(0, 200),
  }).catch(() => undefined);
  return msg;
}

export async function applyDelivery(providerMessageId: string, status: "DELIVERED" | "READ" | "FAILED") {
  const row = await prisma.communicationMessage.findFirst({ where: { providerMessageId } });
  if (!row) return null;
  return prisma.communicationMessage.update({
    where: { id: row.id },
    data: {
      status,
      deliveredAt: status === "DELIVERED" || status === "READ" ? new Date() : row.deliveredAt,
      readAt: status === "READ" ? new Date() : row.readAt,
      failedAt: status === "FAILED" ? new Date() : row.failedAt,
    },
  });
}

export async function processMessageWebhook(channel: string, body: string, signature: string, eventId: string, secret: string) {
  if (!hmacValid(secret, body, signature)) throw new CommosError("Invalid webhook signature", 401, "WEBHOOK_FORGED");
  const existing = await prisma.communicationWebhookEvent.findUnique({ where: { providerEventId: eventId } });
  if (existing) return { duplicate: true };
  try {
    await prisma.communicationWebhookEvent.create({
      data: { providerEventId: eventId, channel, kind: "message", payloadHash: sha256(body) },
    });
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "P2002") return { duplicate: true };
    throw e;
  }
  const parsed = JSON.parse(body) as {
    providerMessageId?: string;
    status?: string;
    inbound?: boolean;
    content?: string;
    leadId?: string;
    dealerId?: string;
  };
  if (parsed.inbound && parsed.leadId && parsed.dealerId) {
    const thread =
      (await prisma.communicationThread.findFirst({ where: { leadId: parsed.leadId, channel, dealerId: parsed.dealerId } })) ??
      (await prisma.communicationThread.create({
        data: { channel, leadId: parsed.leadId, dealerId: parsed.dealerId },
      }));
    await prisma.communicationMessage.create({
      data: {
        threadId: thread.id,
        channel,
        direction: "INBOUND",
        leadId: parsed.leadId,
        dealerId: parsed.dealerId,
        content: parsed.content,
        status: "RECEIVED",
        providerMessageId: parsed.providerMessageId,
      },
    });
    return { inbound: true, duplicate: false };
  }
  if (parsed.providerMessageId && (parsed.status === "DELIVERED" || parsed.status === "READ" || parsed.status === "FAILED")) {
    await applyDelivery(parsed.providerMessageId, parsed.status);
  }
  return { duplicate: false };
}

export async function crmTimeline(actor: CommActor, leadId: string) {
  const dealer = await requireDealerContext(actor);
  await requireLeadForDealer(dealer.id, leadId);
  const [activities, messages, calls, quotes, drives] = await Promise.all([
    prisma.crmActivity.findMany({ where: { leadId, dealerId: dealer.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.communicationMessage.findMany({ where: { leadId, dealerId: dealer.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.callSession.findMany({ where: { leadId, dealerId: dealer.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.quotation.findMany({ where: { leadId }, select: { id: true, status: true, createdAt: true }, take: 20 }),
    prisma.testDriveBooking.findMany({ where: { leadId }, select: { id: true, status: true, createdAt: true }, take: 20 }),
  ]);
  return {
    activities,
    messages: messages.map((m) => ({ ...m, content: m.direction === "OUTBOUND" ? m.content : m.content })),
    calls,
    quotations: quotes,
    testDrives: drives,
  };
}

export async function upsertPolicy(actor: CommActor, organizationId: string, patch: Partial<{ quietStartHour: number; quietEndHour: number; maxOutboundPerDay: number; cooldownMinutes: number }>) {
  if (!isAdminRole(actor.role) && !isDealerRole(actor.role)) throw new CommosError("Forbidden", 403, "FORBIDDEN");
  return prisma.communicationPolicy.upsert({
    where: { organizationId },
    update: patch,
    create: { organizationId, ...patch },
  });
}
