import { prisma } from "@/lib/prisma";
import { CommosError } from "@/lib/commos/errors";
import { hmacValid, sha256 } from "@/lib/commos/crypto";
import { hourInIndia, inQuietHours } from "@/lib/commos/policy";
import type { CommActor } from "@/lib/commos/http";
import { isAdminRole, isDealerRole } from "@/lib/commos/http";
import { assertGrantedOverride, organizationForDealer, requireDealerContext, requireLeadForDealer } from "@/lib/sales-os/access";
import { isAiCallingEnabled, isDialerEnabled } from "@/lib/sales-os/flags";
import { SalesOsError } from "@/lib/sales-os/errors";
import { createCrmActivity } from "@/services/sales-crm.service";

async function telephonyProvider(organizationId?: string | null) {
  return prisma.communicationProvider.findFirst({
    where: {
      channel: "TELEPHONY",
      status: "ACTIVE",
      secretHash: { not: null },
      ...(organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : {}),
    },
  });
}

async function phoneConsent(leadId: string, purpose: string) {
  return prisma.customerConsent.findFirst({
    where: { leadId, channel: "PHONE", purpose, status: "GRANTED", withdrawnAt: null },
  });
}

export async function initiateCall(
  actor: CommActor,
  input: { leadId: string; notes?: string; record?: boolean; aiCalling?: boolean },
) {
  if (!isDealerRole(actor.role) && !isAdminRole(actor.role)) throw new CommosError("Forbidden", 403, "FORBIDDEN");
  const dealer = await requireDealerContext(actor);
  try {
    await assertGrantedOverride(dealer.id, "dialer", isDialerEnabled());
  } catch (e) {
    if (e instanceof SalesOsError) throw new CommosError(e.message, e.status, e.code);
    throw e;
  }
  const lead = await requireLeadForDealer(dealer.id, input.leadId);
  const org = await organizationForDealer(dealer.id);
  const provider = await telephonyProvider(org?.id);
  if (!provider) throw new CommosError("Provider not configured", 403, "PROVIDER_NOT_CONFIGURED");

  const consent = await phoneConsent(lead.id, "ENQUIRY_FOLLOWUP");
  if (!consent) throw new CommosError("Phone consent required", 403, "CONSENT_REQUIRED");

  if (input.aiCalling) {
    if (!isAiCallingEnabled()) throw new CommosError("AI calling is not available", 403, "AI_CALLING_LOCKED");
    try {
      await assertGrantedOverride(dealer.id, "ai_calling", isAiCallingEnabled());
    } catch (e) {
      if (e instanceof SalesOsError) throw new CommosError(e.message, e.status, e.code);
      throw e;
    }
    if (consent.purpose === "MARKETING") {
      throw new CommosError("Phone consent required for AI calling", 403, "CONSENT_REQUIRED");
    }
    const aiKey = process.env.OPENAI_API_KEY?.trim();
    if (!aiKey || aiKey.startsWith("sk-your")) {
      throw new CommosError("AI provider not configured", 403, "AI_PROVIDER_MISSING");
    }
  }

  if (org) {
    const policy = await prisma.communicationPolicy.findUnique({ where: { organizationId: org.id } });
    if (policy && inQuietHours(hourInIndia(), policy.quietStartHour, policy.quietEndHour)) {
      throw new CommosError("Quiet hours — call deferred", 403, "QUIET_HOURS");
    }
  }

  const recordingAllowed = Boolean(input.record) && Boolean(consent);
  const session = await prisma.callSession.create({
    data: {
      leadId: lead.id,
      customerUserId: lead.customerUserId,
      dealerId: dealer.id,
      organizationId: org?.id,
      agentUserId: actor.userId,
      providerId: provider.id,
      providerCallId: `call_${sha256(`${lead.id}:${Date.now()}`).slice(0, 16)}`,
      direction: "outbound",
      status: "INITIATED",
      consentStatus: "GRANTED",
      recordingStatus: recordingAllowed ? "PENDING" : "NOT_REQUESTED",
      notes: input.notes,
      aiCalling: Boolean(input.aiCalling),
    },
  });
  await createCrmActivity(actor, {
    leadId: lead.id,
    activityType: "CALL",
    subject: input.aiCalling ? "AI call initiated" : "Call initiated",
  }).catch(() => undefined);
  return session;
}

export async function getCall(actor: CommActor, id: string) {
  const dealer = await requireDealerContext(actor);
  const row = await prisma.callSession.findFirst({ where: { id, dealerId: dealer.id } });
  if (!row) throw new CommosError("Call not found", 404, "NOT_FOUND");
  return row;
}

export async function applyCallWebhook(body: string, signature: string, eventId: string, secret: string) {
  if (!hmacValid(secret, body, signature)) throw new CommosError("Invalid webhook signature", 401, "WEBHOOK_FORGED");
  const existing = await prisma.communicationWebhookEvent.findUnique({ where: { providerEventId: eventId } });
  if (existing) return { duplicate: true };
  try {
    await prisma.communicationWebhookEvent.create({
      data: { providerEventId: eventId, channel: "TELEPHONY", kind: "call", payloadHash: sha256(body) },
    });
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "P2002") return { duplicate: true };
    throw e;
  }
  const parsed = JSON.parse(body) as { providerCallId?: string; status?: string; durationSeconds?: number };
  if (parsed.providerCallId && parsed.status) {
    const row = await prisma.callSession.findFirst({ where: { providerCallId: parsed.providerCallId } });
    if (row) {
      await prisma.callSession.update({
        where: { id: row.id },
        data: {
          status: parsed.status,
          answeredAt: parsed.status === "ANSWERED" || parsed.status === "COMPLETED" ? new Date() : row.answeredAt,
          endedAt: parsed.status === "COMPLETED" || parsed.status === "FAILED" ? new Date() : row.endedAt,
          durationSeconds: parsed.durationSeconds ?? row.durationSeconds,
        },
      });
    }
  }
  return { duplicate: false };
}

export async function attachRecording(actor: CommActor, callSessionId: string, providerRef: string) {
  const dealer = await requireDealerContext(actor);
  const call = await prisma.callSession.findFirst({ where: { id: callSessionId } });
  if (!call) throw new CommosError("Call not found", 404, "NOT_FOUND");
  if (call.dealerId !== dealer.id && !isAdminRole(actor.role)) throw new CommosError("Forbidden", 403, "CROSS_TENANT");
  if (call.consentStatus !== "GRANTED") throw new CommosError("Recording consent missing", 403, "CONSENT_REQUIRED");
  if (call.recordingStatus === "NOT_REQUESTED") throw new CommosError("Recording not enabled", 403, "RECORDING_DISABLED");
  return prisma.callRecording.create({
    data: {
      callSessionId: call.id,
      providerRef,
      accessPolicy: "ORG_RESTRICTED",
      retentionUntil: new Date(Date.now() + 90 * 86400000),
    },
  });
}

export async function getRecording(actor: CommActor, callSessionId: string) {
  const dealer = await requireDealerContext(actor);
  const rec = await prisma.callRecording.findFirst({
    where: { callSessionId },
    include: { callSession: true },
  });
  if (!rec) throw new CommosError("Recording not found", 404, "NOT_FOUND");
  if (rec.callSession.dealerId !== dealer.id && !isAdminRole(actor.role)) {
    throw new CommosError("Forbidden", 403, "CROSS_TENANT");
  }
  return { id: rec.id, providerRef: rec.providerRef, durationSeconds: rec.durationSeconds, accessPolicy: rec.accessPolicy };
}

export async function ingestTranscript(actor: CommActor, callSessionId: string, text: string, language: string) {
  const dealer = await requireDealerContext(actor);
  const call = await prisma.callSession.findFirst({ where: { id: callSessionId, dealerId: dealer.id } });
  if (!call) throw new CommosError("Call not found", 404, "NOT_FOUND");
  if (!text.trim()) throw new CommosError("Empty transcript", 400, "EMPTY");
  return prisma.callTranscript.upsert({
    where: { callSessionId },
    update: { text, language },
    create: { callSessionId, text, language, source: "PROVIDER" },
  });
}
