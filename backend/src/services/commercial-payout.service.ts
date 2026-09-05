import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/sales-os/access";
import { CommercialError } from "@/lib/commercial/errors";
import { applyAchievementSlab, classifyReconciliation, partnerShareSplit } from "@/lib/commercial/slabs";
import { hashPayoutFile, parsePayoutFile } from "@/lib/commercial/csv";
import { assertAdmin, isAdminRole, type CommercialActor } from "@/lib/commercial/http";
import { requirePartnerOrg } from "@/services/commercial-billing.service";

function json(v: unknown): Prisma.InputJsonValue {
  return v as Prisma.InputJsonValue;
}

function money(n: unknown) {
  const v = Number(n);
  if (!Number.isFinite(v)) throw new CommercialError("Invalid amount", 400, "INVALID_AMOUNT");
  return Math.round(v * 100) / 100;
}

export async function ensurePayoutAccount(organizationId: string) {
  return prisma.partnerPayoutAccount.upsert({
    where: { organizationId },
    create: { organizationId },
    update: {},
  });
}

export async function createPayoutEntry(
  actor: CommercialActor,
  input: {
    organizationId: string;
    sourceType: string;
    sourceId: string;
    amount: number;
    product?: string;
    period?: string;
    financeCommissionId?: string;
    status?: string;
  },
) {
  assertAdmin(actor);
  await ensurePayoutAccount(input.organizationId);
  try {
    const entry = await prisma.partnerPayoutEntry.create({
      data: {
        organizationId: input.organizationId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        financeCommissionId: input.financeCommissionId,
        amount: money(input.amount),
        status: input.status ?? "PENDING",
        product: input.product,
        period: input.period,
      },
    });
    await writeAudit(actor, "commercial.payout.entry", { entryId: entry.id });
    return entry;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Unique") || msg.includes("unique")) {
      throw new CommercialError("Duplicate payout entry", 409, "DUPLICATE_PAYOUT");
    }
    throw e;
  }
}

export async function adaptFinanceCommission(actor: CommercialActor, commissionId: string, organizationId: string) {
  assertAdmin(actor);
  const commission = await prisma.financeCommission.findUnique({ where: { id: commissionId } });
  if (!commission) throw new CommercialError("Finance commission not found", 404, "COMMISSION_NOT_FOUND");
  const existing = await prisma.partnerPayoutEntry.findUnique({ where: { financeCommissionId: commissionId } });
  if (existing) return existing;
  return createPayoutEntry(actor, {
    organizationId,
    sourceType: "FINANCE_COMMISSION",
    sourceId: commissionId,
    financeCommissionId: commissionId,
    amount: Number(commission.amount),
    status: "PENDING",
    product: "finance",
  });
}

export async function setPayoutEntryStatus(actor: CommercialActor, entryId: string, status: string) {
  assertAdmin(actor);
  const allowed = ["PENDING", "UNDER_REVIEW", "APPROVED", "IN_PROGRESS", "PAID", "REJECTED", "ON_HOLD", "REVERSED"];
  if (!allowed.includes(status)) throw new CommercialError("Invalid payout status", 400, "INVALID_STATUS");
  const entry = await prisma.partnerPayoutEntry.update({ where: { id: entryId }, data: { status } });
  await writeAudit(actor, "commercial.payout.status", { entryId, status });
  return entry;
}

export async function createPayoutRequest(actor: CommercialActor, entryIds: string[], organizationId?: string) {
  const org = await requirePartnerOrg(actor, organizationId);
  if (!entryIds.length) throw new CommercialError("No entries selected", 400, "NO_ENTRIES");
  const entries = await prisma.partnerPayoutEntry.findMany({ where: { id: { in: entryIds } } });
  if (entries.length !== entryIds.length) throw new CommercialError("Unknown payout entries", 404, "ENTRY_NOT_FOUND");
  for (const e of entries) {
    if (e.organizationId !== org.id) throw new CommercialError("Forbidden", 403, "CROSS_TENANT");
    if (e.status !== "APPROVED") throw new CommercialError("Only approved earnings can be invoiced", 400, "NOT_ELIGIBLE");
  }
  const claimed = await prisma.partnerPayoutRequestItem.findMany({ where: { entryId: { in: entryIds } } });
  if (claimed.length) throw new CommercialError("Entry already included in a payout request", 409, "DUPLICATE_PAYOUT");
  const amount = entries.reduce((s, e) => s + Number(e.amount), 0);
  const request = await prisma.partnerPayoutRequest.create({
    data: {
      organizationId: org.id,
      amount,
      status: "UNDER_REVIEW",
      items: { create: entryIds.map((entryId) => ({ entryId })) },
    },
    include: { items: true },
  });
  await writeAudit(actor, "commercial.payout.request", { requestId: request.id, amount });
  return request;
}

export async function reviewPayoutRequest(actor: CommercialActor, requestId: string, status: string, note?: string) {
  assertAdmin(actor);
  const allowed = ["APPROVED", "REJECTED", "ON_HOLD", "IN_PROGRESS", "PAID"];
  if (!allowed.includes(status)) throw new CommercialError("Invalid request status", 400, "INVALID_STATUS");
  const request = await prisma.partnerPayoutRequest.update({
    where: { id: requestId },
    data: {
      status,
      reviewNote: note,
      reviewedBy: actor.userId,
      paidAt: status === "PAID" ? new Date() : undefined,
    },
    include: { items: true },
  });
  if (status === "PAID") {
    await prisma.partnerPayoutEntry.updateMany({
      where: { id: { in: request.items.map((i) => i.entryId) } },
      data: { status: "PAID" },
    });
  }
  if (status === "REJECTED") {
    await prisma.partnerPayoutRequestItem.deleteMany({ where: { requestId } });
  }
  await writeAudit(actor, "commercial.payout.review", { requestId, status });
  return request;
}

export async function adjustPayoutEntry(
  actor: CommercialActor,
  entryId: string,
  kind: string,
  amount: number,
  reason: string,
) {
  assertAdmin(actor);
  if (!reason.trim()) throw new CommercialError("Adjustment reason is required", 400, "REASON_REQUIRED");
  const kinds = ["clawback", "reversal", "short_payment", "excess_payment", "manual_adjustment"];
  if (!kinds.includes(kind)) throw new CommercialError("Invalid adjustment kind", 400, "INVALID_ADJUSTMENT");
  const original = await prisma.partnerPayoutEntry.findUnique({ where: { id: entryId } });
  if (!original) throw new CommercialError("Entry not found", 404, "ENTRY_NOT_FOUND");
  const adjAmount = money(amount);
  const adjustment = await prisma.partnerPayoutAdjustment.create({
    data: { entryId, kind, amount: adjAmount, reason: reason.slice(0, 240), actorUserId: actor.userId },
  });
  const follow = await prisma.partnerPayoutEntry.create({
    data: {
      organizationId: original.organizationId,
      sourceType: "ADJUSTMENT",
      sourceId: adjustment.id,
      amount: kind === "clawback" || kind === "reversal" || kind === "short_payment" ? -Math.abs(adjAmount) : Math.abs(adjAmount),
      status: "PENDING",
      originalEntryId: original.id,
      reason: reason.slice(0, 240),
      product: original.product,
      period: original.period,
    },
  });
  await writeAudit(actor, "commercial.payout.adjustment", { entryId, kind, amount: adjAmount, followId: follow.id });
  return { adjustment, follow, originalAmount: original.amount };
}

export async function earningsDashboard(actor: CommercialActor, organizationId?: string) {
  if (isAdminRole(actor.role) && !organizationId) {
    const entries = await prisma.partnerPayoutEntry.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
    const sum = (status?: string) =>
      entries.filter((e) => (status ? e.status === status : true)).reduce((s, e) => s + Number(e.amount), 0);
    return {
      totalEligible: sum("APPROVED"),
      pending: sum("PENDING") + sum("UNDER_REVIEW"),
      approved: sum("APPROVED"),
      inProgress: sum("IN_PROGRESS"),
      paid: sum("PAID"),
      rejectedHold: sum("REJECTED") + sum("ON_HOLD"),
      adjustment: entries.filter((e) => e.sourceType === "ADJUSTMENT").reduce((s, e) => s + Number(e.amount), 0),
      entries,
    };
  }
  const org = await requirePartnerOrg(actor, organizationId);
  const entries = await prisma.partnerPayoutEntry.findMany({ where: { organizationId: org.id } });
  const sum = (status?: string) =>
    entries.filter((e) => (status ? e.status === status : true)).reduce((s, e) => s + Number(e.amount), 0);
  return {
    totalEligible: sum("APPROVED"),
    pending: sum("PENDING") + sum("UNDER_REVIEW"),
    approved: sum("APPROVED"),
    inProgress: sum("IN_PROGRESS"),
    paid: sum("PAID"),
    rejectedHold: sum("REJECTED") + sum("ON_HOLD"),
    adjustment: entries.filter((e) => e.sourceType === "ADJUSTMENT").reduce((s, e) => s + Number(e.amount), 0),
    entries,
  };
}

export async function previewPayoutImport(actor: CommercialActor, fileName: string, content: string) {
  assertAdmin(actor);
  const fileHash = hashPayoutFile(content);
  const dup = await prisma.payoutImportBatch.findUnique({ where: { fileHash } });
  if (dup) throw new CommercialError("Duplicate import file", 409, "DUPLICATE_IMPORT");
  const parsed = parsePayoutFile(fileName, content);
  const valid = parsed.rows.filter((r) => r.errors.length === 0);
  const invalid = parsed.rows.filter((r) => r.errors.length > 0);
  const batch = await prisma.payoutImportBatch.create({
    data: {
      fileName,
      fileHash,
      status: "PREVIEW",
      actorUserId: actor.userId,
      rowCount: parsed.rows.length,
      validCount: valid.length,
      invalidCount: invalid.length,
      rows: {
        create: parsed.rows.map((r) => ({
          rowNumber: r.rowNumber,
          period: r.period,
          bank: r.bank,
          product: r.product,
          reference: r.reference,
          applicationRef: r.applicationRef || null,
          disbursedAmount: r.disbursedAmount,
          payoutRate: r.payoutRate,
          grossPayout: r.grossPayout,
          adjustment: r.adjustment,
          rowStatus: r.errors.length ? "INVALID" : "VALID",
          errors: json(r.errors),
          fingerprint: r.fingerprint,
        })),
      },
    },
    include: { rows: true },
  });
  await writeAudit(actor, "commercial.payout.import.preview", { batchId: batch.id });
  return batch;
}

export async function confirmPayoutImport(actor: CommercialActor, batchId: string, organizationId: string) {
  assertAdmin(actor);
  const batch = await prisma.payoutImportBatch.findUnique({ where: { id: batchId }, include: { rows: true } });
  if (!batch) throw new CommercialError("Import batch not found", 404, "BATCH_NOT_FOUND");
  if (batch.status === "CONFIRMED") throw new CommercialError("Import already confirmed", 409, "DUPLICATE_IMPORT");
  await ensurePayoutAccount(organizationId);
  await prisma.$transaction(async (tx) => {
    for (const row of batch.rows.filter((r) => r.rowStatus === "VALID")) {
      const sourceId = `${batch.id}:${row.fingerprint}`;
      const entry = await tx.partnerPayoutEntry.create({
        data: {
          organizationId,
          sourceType: "IMPORT_ROW",
          sourceId,
          amount: Number(row.grossPayout ?? 0),
          status: "PENDING",
          product: row.product,
          period: row.period,
          metadata: json({ rowId: row.id, bank: row.bank, reference: row.reference }),
        },
      });
      await tx.payoutImportRow.update({ where: { id: row.id }, data: { postedEntryId: entry.id, rowStatus: "POSTED" } });
    }
    await tx.payoutImportBatch.update({
      where: { id: batchId },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    });
  });
  await writeAudit(actor, "commercial.payout.import.confirm", { batchId });
  return prisma.payoutImportBatch.findUniqueOrThrow({ where: { id: batchId }, include: { rows: true } });
}

export async function upsertPayoutRule(
  actor: CommercialActor,
  input: {
    id?: string;
    organizationId?: string;
    bank?: string;
    product: string;
    period?: string;
    validFrom: string;
    validTo?: string;
    partnerSharePercent?: number;
    motorcartSharePercent?: number;
    fixedAmount?: number;
    version?: number;
    slabs: Array<{ minInclusive: number; maxExclusive: number | null; percent: number }>;
  },
) {
  assertAdmin(actor);
  if (!input.slabs.length) throw new CommercialError("At least one slab is required", 400, "NO_SLABS_CONFIGURED");
  for (const s of input.slabs) {
    if (s.percent == null || !Number.isFinite(s.percent)) {
      throw new CommercialError("Slab percent must be configured", 400, "PERCENT_REQUIRED");
    }
  }
  const data = {
    organizationId: input.organizationId,
    bank: input.bank,
    product: input.product,
    period: input.period,
    validFrom: new Date(input.validFrom),
    validTo: input.validTo ? new Date(input.validTo) : null,
    partnerSharePercent: input.partnerSharePercent,
    motorcartSharePercent: input.motorcartSharePercent,
    fixedAmount: input.fixedAmount,
    version: input.version ?? 1,
  };
  const rule = input.id
    ? await prisma.commercialPayoutRule.update({
        where: { id: input.id },
        data: { ...data, slabs: { deleteMany: {}, create: input.slabs } },
        include: { slabs: true },
      })
    : await prisma.commercialPayoutRule.create({
        data: { ...data, slabs: { create: input.slabs } },
        include: { slabs: true },
      });
  await writeAudit(actor, "commercial.payout.rule", { ruleId: rule.id, version: rule.version });
  return rule;
}

export async function evaluatePayoutRule(ruleId: string, achievement: number, realized?: number) {
  const rule = await prisma.commercialPayoutRule.findUnique({ where: { id: ruleId }, include: { slabs: true } });
  if (!rule) throw new CommercialError("Rule not found", 404, "RULE_NOT_FOUND");
  const slabs = rule.slabs.map((s) => ({
    minInclusive: Number(s.minInclusive),
    maxExclusive: s.maxExclusive == null ? null : Number(s.maxExclusive),
    percent: Number(s.percent),
  }));
  const expected = applyAchievementSlab(achievement, slabs);
  const received = realized == null ? null : money(realized);
  const share =
    received == null
      ? null
      : partnerShareSplit(received, rule.partnerSharePercent == null ? null : Number(rule.partnerSharePercent));
  return {
    eligibleAchievement: achievement,
    applicablePercent: expected.slab.percent,
    grossExpected: expected.grossExpected,
    actualReceived: received,
    difference: received == null ? null : money(received - expected.grossExpected),
    partnerShare: share,
    expectedOnly: received == null,
  };
}

export async function upsertReconciliation(
  actor: CommercialActor,
  input: { source: string; period: string; expectedAmount: number; receivedAmount: number; reference?: string },
) {
  assertAdmin(actor);
  const classified = classifyReconciliation(money(input.expectedAmount), money(input.receivedAmount));
  const row = await prisma.reconciliationEntry.create({
    data: {
      source: input.source,
      period: input.period,
      expectedAmount: money(input.expectedAmount),
      receivedAmount: money(input.receivedAmount),
      difference: classified.difference,
      status: classified.status,
      reference: input.reference,
    },
  });
  await writeAudit(actor, "commercial.reconciliation", { id: row.id, status: row.status });
  return row;
}

export async function reviewReconciliation(actor: CommercialActor, id: string) {
  assertAdmin(actor);
  const row = await prisma.reconciliationEntry.update({
    where: { id },
    data: { status: "REVIEWED", reviewedBy: actor.userId },
  });
  await writeAudit(actor, "commercial.reconciliation.review", { id });
  return row;
}

export async function listPayoutRules(actor: CommercialActor) {
  if (!isAdminRole(actor.role)) throw new CommercialError("Forbidden", 403, "FORBIDDEN");
  return prisma.commercialPayoutRule.findMany({ include: { slabs: true }, orderBy: { createdAt: "desc" } });
}

export async function listReconciliations(actor: CommercialActor) {
  assertAdmin(actor);
  return prisma.reconciliationEntry.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
}

export async function listPayoutRequests(actor: CommercialActor, organizationId?: string) {
  if (isAdminRole(actor.role) && !organizationId) {
    return prisma.partnerPayoutRequest.findMany({ include: { items: true }, orderBy: { createdAt: "desc" }, take: 200 });
  }
  const org = await requirePartnerOrg(actor, organizationId);
  return prisma.partnerPayoutRequest.findMany({
    where: { organizationId: org.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
}
