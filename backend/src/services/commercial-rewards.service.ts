import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/sales-os/access";
import { CommercialError } from "@/lib/commercial/errors";
import { assertAdmin, isAdminRole, type CommercialActor } from "@/lib/commercial/http";

async function accountFor(userId: string) {
  return prisma.rewardAccount.upsert({
    where: { userId },
    create: { userId, balance: 0 },
    update: {},
  });
}

function assertCustomer(actor: CommercialActor, userId?: string) {
  if (isAdminRole(actor.role) && userId) return userId;
  if (actor.role !== "customer" && !isAdminRole(actor.role)) {
    throw new CommercialError("Forbidden", 403, "FORBIDDEN");
  }
  if (userId && userId !== actor.userId && !isAdminRole(actor.role)) {
    throw new CommercialError("Forbidden", 403, "CROSS_TENANT");
  }
  return actor.userId;
}

export async function getRewardAccount(actor: CommercialActor, userId?: string) {
  const uid = assertCustomer(actor, userId);
  const account = await accountFor(uid);
  const ledger = await prisma.rewardLedger.findMany({
    where: { accountId: account.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return { account, ledger, balance: account.balance };
}

export async function upsertRewardRule(
  actor: CommercialActor,
  input: { id?: string; code: string; source: string; points: number; active?: boolean; expiryDays?: number; allowNegative?: boolean },
) {
  assertAdmin(actor);
  if (!Number.isInteger(input.points)) throw new CommercialError("Points must be an integer", 400, "INVALID_POINTS");
  const data = {
    code: input.code,
    source: input.source,
    points: input.points,
    active: Boolean(input.active),
    expiryDays: input.expiryDays,
    allowNegative: Boolean(input.allowNegative),
  };
  const rule = input.id
    ? await prisma.rewardRule.update({ where: { id: input.id }, data })
    : await prisma.rewardRule.create({ data });
  await writeAudit(actor, "commercial.reward.rule", { ruleId: rule.id, active: rule.active });
  return rule;
}

export async function applyReward(
  actor: CommercialActor,
  input: {
    userId: string;
    ruleCode?: string;
    entryType: "EARN" | "REDEEM" | "EXPIRE" | "ADJUST" | "REVERSE";
    points?: number;
    reason: string;
    source: string;
    sourceRef?: string;
    sourceEventKey?: string;
  },
) {
  if (input.entryType === "EARN" && !isAdminRole(actor.role)) {
    throw new CommercialError("Forbidden", 403, "FORBIDDEN");
  }
  if (["ADJUST", "EXPIRE", "REVERSE"].includes(input.entryType)) assertAdmin(actor);
  const uid = input.userId;
  if (!isAdminRole(actor.role) && uid !== actor.userId) throw new CommercialError("Forbidden", 403, "CROSS_TENANT");

  let points = input.points;
  let allowNegative = false;
  let expiresAt: Date | undefined;
  if (input.ruleCode) {
    const rule = await prisma.rewardRule.findUnique({ where: { code: input.ruleCode } });
    if (!rule || !rule.active) throw new CommercialError("Reward rule is not active", 400, "RULE_INACTIVE");
    points = rule.points;
    allowNegative = rule.allowNegative;
    if (rule.expiryDays) expiresAt = new Date(Date.now() + rule.expiryDays * 86400000);
  }
  if (points == null || !Number.isInteger(points)) throw new CommercialError("Points required", 400, "INVALID_POINTS");

  const signed =
    input.entryType === "REDEEM" || input.entryType === "EXPIRE" || input.entryType === "REVERSE"
      ? -Math.abs(points)
      : input.entryType === "EARN"
        ? Math.abs(points)
        : points;

  return prisma.$transaction(async (tx) => {
    if (input.sourceEventKey) {
      const dup = await tx.rewardLedger.findUnique({ where: { sourceEventKey: input.sourceEventKey } });
      if (dup) return { duplicate: true, ledger: dup };
    }
    const account = await tx.rewardAccount.upsert({
      where: { userId: uid },
      create: { userId: uid, balance: 0 },
      update: {},
    });
    const next = account.balance + signed;
    if (next < 0 && !allowNegative) {
      throw new CommercialError("Negative reward balance is not allowed", 400, "NEGATIVE_BALANCE");
    }
    await tx.rewardAccount.update({ where: { id: account.id }, data: { balance: next } });
    const ledger = await tx.rewardLedger.create({
      data: {
        accountId: account.id,
        entryType: input.entryType,
        points: signed,
        balanceAfter: next,
        reason: input.reason.slice(0, 160),
        source: input.source,
        sourceRef: input.sourceRef,
        sourceEventKey: input.sourceEventKey,
        expiresAt,
        actorUserId: actor.userId,
      },
    });
    return { duplicate: false, ledger, balance: next };
  }).then(async (result) => {
    await writeAudit(actor, "commercial.reward.ledger", {
      entryType: input.entryType,
      userId: uid,
      points: signed,
    });
    return result;
  });
}

export async function monthlyStatement(actor: CommercialActor, year: number, month: number, userId?: string) {
  const uid = assertCustomer(actor, userId);
  const account = await accountFor(uid);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  const before = await prisma.rewardLedger.findMany({
    where: { accountId: account.id, createdAt: { lt: start } },
    orderBy: { createdAt: "desc" },
    take: 1,
  });
  const opening = before[0]?.balanceAfter ?? 0;
  const rows = await prisma.rewardLedger.findMany({
    where: { accountId: account.id, createdAt: { gte: start, lt: end } },
    orderBy: { createdAt: "asc" },
  });
  const sum = (t: string) => rows.filter((r) => r.entryType === t).reduce((s, r) => s + r.points, 0);
  const earned = rows.filter((r) => r.entryType === "EARN").reduce((s, r) => s + r.points, 0);
  const redeemed = Math.abs(sum("REDEEM"));
  const expired = Math.abs(sum("EXPIRE"));
  const adjustments = sum("ADJUST") + sum("REVERSE");
  const closing = rows.at(-1)?.balanceAfter ?? opening;
  return {
    openingBalance: opening,
    pointsEarned: earned,
    pointsRedeemed: redeemed,
    pointsExpired: expired,
    adjustments,
    closingBalance: closing,
    rows,
  };
}

export async function listRewardRules(actor: CommercialActor) {
  assertAdmin(actor);
  return prisma.rewardRule.findMany({ orderBy: { createdAt: "desc" } });
}
