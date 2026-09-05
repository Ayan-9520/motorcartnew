import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SalesOsError } from "@/lib/sales-os/errors";
import {
  CALL_DISPOSITIONS,
  CRM_ACTIVITY_TYPES,
  CONSENT_CHANNELS,
  CONSENT_PURPOSES,
  TASK_CANCELLED,
  TASK_DONE,
  TASK_OPEN,
} from "@/lib/sales-os/constants";
import { calculateLeadQuality, extractIndiaPin, isLeadQuality, type QualitySignals } from "@/lib/sales-os/quality";
import { organizationForDealer, requireDealerContext, requireLeadForDealer, writeAudit } from "@/lib/sales-os/access";
import { assertSalesOsOn, type SalesActor } from "@/lib/sales-os/http";
import { UNASSIGNED_DEALER_SLUG } from "@/lib/leads/enquiry.types";

function meta(lead: { metadata: unknown }): Record<string, unknown> {
  return (lead.metadata ?? {}) as Record<string, unknown>;
}

export async function signalsForLead(leadId: string, extras?: Partial<QualitySignals>): Promise<QualitySignals> {
  const lead = await prisma.lead.findFirst({ where: { id: leadId } });
  if (!lead) throw new SalesOsError("Lead not found", 404, "LEAD_NOT_FOUND");
  const m = meta(lead);
  const [qCount, tdCount] = await Promise.all([
    prisma.quotation.count({ where: { leadId } }),
    prisma.testDriveBooking.count({ where: { leadId } }),
  ]);
  const pin = lead.pincode || extractIndiaPin(m.location) || extractIndiaPin(lead.notes);
  return {
    hasVerifiedContact: /^\d{10}$/.test(lead.phone.replace(/\D/g, "").slice(-10)),
    hasVehicle: Boolean(lead.vehicleId || lead.vehicleInterest),
    hasBudget: m.budget != null || m.budget_max != null,
    hasTimeline: Boolean(m.timeline || m.purchase_timeline),
    financeRequired: Boolean(m.finance || m.finance_interest || m.financeRequired),
    exchangeRequired: Boolean(m.exchange || m.trade_in || m.exchangeRequired),
    hasValidPin: Boolean(pin),
    repeatedEnquiry: Boolean(extras?.repeatedEnquiry || m.duplicate),
    quotationExists: qCount > 0,
    testDriveExists: tdCount > 0,
    ...extras,
  };
}

export async function persistLeadQuality(leadId: string, extras?: Partial<QualitySignals>) {
  const lead = await prisma.lead.findFirst({ where: { id: leadId } });
  if (!lead) throw new SalesOsError("Lead not found", 404, "LEAD_NOT_FOUND");
  if (lead.qualityOverridden) return lead;
  const result = calculateLeadQuality(await signalsForLead(leadId, extras));
  return prisma.lead.update({
    where: { id: leadId },
    data: { quality: result.quality, qualityScore: result.score, qualityReason: result.reason },
  });
}

export async function overrideLeadQuality(
  actor: SalesActor,
  leadId: string,
  quality: string,
  reason?: string,
) {
  assertSalesOsOn();
  if (!isLeadQuality(quality)) throw new SalesOsError("Invalid quality", 400, "INVALID_QUALITY");
  const dealer = await requireDealerContext(actor);
  const lead = await requireLeadForDealer(dealer.id, leadId);
  const updated = await prisma.lead.update({
    where: { id: lead.id },
    data: {
      quality,
      qualityOverridden: true,
      qualityOverrideBy: actor.userId,
      qualityOverrideAt: new Date(),
      qualityReason: reason ? `manual:${reason}` : `manual:${quality}`,
    },
  });
  await writeAudit(actor, "lead.quality_override", { leadId, quality, dealerId: dealer.id });
  return updated;
}

export async function listCrmLeads(actor: SalesActor) {
  assertSalesOsOn();
  const dealer = await requireDealerContext(actor);
  return prisma.lead.findMany({
    where: { dealerId: dealer.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function createCrmActivity(
  actor: SalesActor,
  input: {
    leadId: string;
    opportunityId?: string;
    activityType: string;
    subject: string;
    notes?: string;
    scheduledAt?: string;
    completedAt?: string;
    dealerId?: string;
    organizationId?: string;
  },
) {
  assertSalesOsOn();
  const dealer = await requireDealerContext(actor, input.dealerId);
  const lead = await requireLeadForDealer(dealer.id, input.leadId);
  if (input.organizationId) {
    const org = await organizationForDealer(dealer.id);
    if (!org || org.id !== input.organizationId) {
      throw new SalesOsError("Forged organization id", 403, "FORGED_ORGANIZATION");
    }
  }
  if (!(CRM_ACTIVITY_TYPES as readonly string[]).includes(input.activityType)) {
    throw new SalesOsError("Invalid activity type", 400, "INVALID_ACTIVITY");
  }
  if (input.opportunityId) {
    const opp = await prisma.opportunity.findFirst({ where: { id: input.opportunityId, dealerId: dealer.id } });
    if (!opp) throw new SalesOsError("Opportunity not found", 404, "OPPORTUNITY_NOT_FOUND");
  }
  const org = await organizationForDealer(dealer.id);
  return prisma.crmActivity.create({
    data: {
      leadId: lead.id,
      opportunityId: input.opportunityId ?? null,
      dealerId: dealer.id,
      organizationId: org?.id ?? null,
      actorUserId: actor.userId,
      activityType: input.activityType,
      subject: input.subject.slice(0, 160),
      notes: input.notes ?? null,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      completedAt: input.completedAt ? new Date(input.completedAt) : null,
    },
  });
}

export async function listCrmActivities(actor: SalesActor, leadId?: string) {
  assertSalesOsOn();
  const dealer = await requireDealerContext(actor);
  return prisma.crmActivity.findMany({
    where: { dealerId: dealer.id, ...(leadId ? { leadId } : {}) },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function logLeadCall(
  actor: SalesActor,
  input: {
    leadId: string;
    disposition: string;
    notes?: string;
    followUpAt?: string;
    durationSeconds?: number;
    dealerId?: string;
  },
) {
  assertSalesOsOn();
  const dealer = await requireDealerContext(actor, input.dealerId);
  const lead = await requireLeadForDealer(dealer.id, input.leadId);
  if (!(CALL_DISPOSITIONS as readonly string[]).includes(input.disposition)) {
    throw new SalesOsError("Invalid disposition", 400, "INVALID_DISPOSITION");
  }
  const call = await prisma.leadCall.create({
    data: {
      leadId: lead.id,
      dealerId: dealer.id,
      calledBy: actor.userId,
      direction: "outbound",
      outcome: input.disposition,
      notes: input.notes ?? null,
      followUpAt: input.followUpAt ? new Date(input.followUpAt) : null,
      durationSeconds: input.durationSeconds ?? null,
    },
  });
  await createCrmActivity(actor, {
    leadId: lead.id,
    activityType: "CALL",
    subject: `Call logged: ${input.disposition}`,
    notes: input.notes,
    completedAt: new Date().toISOString(),
  });
  return call;
}

export async function listLeadCalls(actor: SalesActor, leadId?: string) {
  assertSalesOsOn();
  const dealer = await requireDealerContext(actor);
  return prisma.leadCall.findMany({
    where: { dealerId: dealer.id, ...(leadId ? { leadId } : {}) },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function createFollowUp(
  actor: SalesActor,
  input: { leadId?: string; opportunityId?: string; title: string; dueAt: string; assignedTo?: string; description?: string },
) {
  assertSalesOsOn();
  const dealer = await requireDealerContext(actor);
  if (input.leadId) await requireLeadForDealer(dealer.id, input.leadId);
  const task = await prisma.crmTask.create({
    data: {
      dealerId: dealer.id,
      leadId: input.leadId ?? null,
      opportunityId: input.opportunityId ?? null,
      assignedTo: input.assignedTo ?? actor.userId,
      title: input.title,
      description: input.description ?? null,
      dueAt: new Date(input.dueAt),
      status: TASK_OPEN,
      taskType: "follow_up",
    },
  });
  if (input.leadId) {
    await createCrmActivity(actor, {
      leadId: input.leadId,
      opportunityId: input.opportunityId,
      activityType: "FOLLOW_UP",
      subject: input.title,
      scheduledAt: input.dueAt,
    });
  }
  return task;
}

export async function listFollowUps(actor: SalesActor, bucket?: "overdue" | "today" | "upcoming") {
  assertSalesOsOn();
  const dealer = await requireDealerContext(actor);
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const dueFilter =
    bucket === "overdue"
      ? { dueAt: { lt: start }, status: TASK_OPEN }
      : bucket === "today"
        ? { dueAt: { gte: start, lt: end }, status: TASK_OPEN }
        : bucket === "upcoming"
          ? { dueAt: { gte: end }, status: TASK_OPEN }
          : {};
  return prisma.crmTask.findMany({
    where: { dealerId: dealer.id, ...dueFilter },
    orderBy: { dueAt: "asc" },
    take: 200,
  });
}

export async function completeFollowUp(actor: SalesActor, taskId: string) {
  assertSalesOsOn();
  const dealer = await requireDealerContext(actor);
  const task = await prisma.crmTask.findFirst({ where: { id: taskId, dealerId: dealer.id } });
  if (!task) throw new SalesOsError("Task not found", 404, "TASK_NOT_FOUND");
  return prisma.crmTask.update({
    where: { id: task.id },
    data: { status: TASK_DONE, completedAt: new Date() },
  });
}

export async function cancelFollowUp(actor: SalesActor, taskId: string) {
  assertSalesOsOn();
  const dealer = await requireDealerContext(actor);
  const task = await prisma.crmTask.findFirst({ where: { id: taskId, dealerId: dealer.id } });
  if (!task) throw new SalesOsError("Task not found", 404, "TASK_NOT_FOUND");
  return prisma.crmTask.update({
    where: { id: task.id },
    data: { status: TASK_CANCELLED, cancelledAt: new Date() },
  });
}

export async function recordEnquiryConsent(input: {
  userId?: string | null;
  leadId: string;
  consent: boolean | null;
  preferredContact?: string | null;
  email?: string | null;
  source: string;
}) {
  if (input.consent !== true) return;
  const channels: string[] = ["PHONE"];
  if (input.email) channels.push("EMAIL");
  if (input.preferredContact === "whatsapp") channels.push("WHATSAPP");
  for (const channel of channels) {
    if (!(CONSENT_CHANNELS as readonly string[]).includes(channel)) continue;
    await prisma.customerConsent.create({
      data: {
        userId: input.userId ?? null,
        leadId: input.leadId,
        channel,
        purpose: "ENQUIRY_FOLLOWUP",
        status: "GRANTED",
        source: input.source,
      },
    });
  }
}

export async function createConsent(
  actor: SalesActor,
  input: { leadId?: string; channel: string; purpose: string; source: string },
) {
  assertSalesOsOn();
  if (!(CONSENT_CHANNELS as readonly string[]).includes(input.channel)) {
    throw new SalesOsError("Invalid channel", 400, "INVALID_CHANNEL");
  }
  if (!(CONSENT_PURPOSES as readonly string[]).includes(input.purpose)) {
    throw new SalesOsError("Invalid purpose", 400, "INVALID_PURPOSE");
  }
  let userId: string | null = actor.role === "customer" ? actor.userId : null;
  let leadId = input.leadId ?? null;
  if (actor.role === "customer") {
    userId = actor.userId;
  } else {
    const dealer = await requireDealerContext(actor);
    if (leadId) await requireLeadForDealer(dealer.id, leadId);
  }
  const row = await prisma.customerConsent.create({
    data: {
      userId,
      leadId,
      channel: input.channel,
      purpose: input.purpose,
      status: "GRANTED",
      source: input.source,
    },
  });
  await writeAudit(actor, "consent.granted", { consentId: row.id, channel: input.channel });
  return row;
}

export async function withdrawConsent(actor: SalesActor, consentId: string) {
  assertSalesOsOn();
  const row = await prisma.customerConsent.findFirst({ where: { id: consentId } });
  if (!row) throw new SalesOsError("Consent not found", 404, "CONSENT_NOT_FOUND");
  if (actor.role === "customer" && row.userId !== actor.userId) {
    throw new SalesOsError("Forbidden", 403, "CROSS_TENANT");
  }
  if (isDealerRoleish(actor.role) && row.leadId) {
    const dealer = await requireDealerContext(actor);
    await requireLeadForDealer(dealer.id, row.leadId);
  }
  const updated = await prisma.customerConsent.update({
    where: { id: row.id },
    data: { status: "WITHDRAWN", withdrawnAt: new Date() },
  });
  await writeAudit(actor, "consent.withdrawn", { consentId: row.id });
  return updated;
}

function isDealerRoleish(role: string) {
  return role === "dealer" || role.endsWith("_dealer");
}

export async function applySalesOsOnEnquiry(leadId: string, opts: {
  actorUserId?: string;
  consent: boolean | null;
  preferredContact?: string | null;
  email?: string | null;
  location?: string | null;
  duplicate?: boolean;
  source: string;
}) {
  const pin = extractIndiaPin(opts.location);
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      customerUserId: opts.actorUserId ?? undefined,
      pincode: pin,
    },
  });
  await persistLeadQuality(leadId, { repeatedEnquiry: Boolean(opts.duplicate) });
  await recordEnquiryConsent({
    userId: opts.actorUserId,
    leadId,
    consent: opts.consent,
    preferredContact: opts.preferredContact,
    email: opts.email,
    source: opts.source,
  });
}

export { UNASSIGNED_DEALER_SLUG };
export type { Prisma };
