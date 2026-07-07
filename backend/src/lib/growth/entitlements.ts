import type { GrowthWorkspaceEntitlement, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_GROWTH_LIMITS } from "@/lib/growth/constants";

type LimitsJson = Record<string, number | string>;
type UsageJson = Record<string, number | string>;

export function currentPeriod(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function defaultLimits(planSlug = "free"): LimitsJson {
  return { ...DEFAULT_GROWTH_LIMITS, plan: planSlug };
}

export function defaultUsage(): UsageJson {
  return {
    period: currentPeriod(),
    broadcasts_sent: 0,
    design_exports: 0,
    lead_events: 0,
    storage_bytes: 0,
  };
}

export async function ensureEntitlements(workspaceId: string, planSlug = "free") {
  const existing = await prisma.growthWorkspaceEntitlement.findUnique({
    where: { workspaceId },
  });
  if (existing) return existing;
  return prisma.growthWorkspaceEntitlement.create({
    data: {
      workspaceId,
      planSlug,
      limits: defaultLimits(planSlug),
      usage: defaultUsage(),
    },
  });
}

function parseJsonRecord(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

export function getLimitNumber(ent: GrowthWorkspaceEntitlement, key: string): number | null {
  const limits = parseJsonRecord(ent.limits);
  const v = limits[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

export function getUsageNumber(ent: GrowthWorkspaceEntitlement, key: string): number {
  const usage = parseJsonRecord(ent.usage);
  const v = usage[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return 0;
}

export class GrowthQuotaError extends Error {
  constructor(public readonly code = "quota_exceeded") {
    super(code);
  }
}

export async function assertQuota(
  workspaceId: string,
  limitKey: string,
  usageKey: string,
  increment = 1
) {
  const ent = await ensureEntitlements(workspaceId);
  const usage = parseJsonRecord(ent.usage);
  const period = currentPeriod();
  if (usage.period !== period) {
    usage.period = period;
    usage.broadcasts_sent = 0;
    usage.design_exports = 0;
    usage.lead_events = 0;
  }

  const limit = getLimitNumber(ent, limitKey);
  if (limit == null) return ent;

  const used = getUsageNumber({ ...ent, usage } as GrowthWorkspaceEntitlement, usageKey);
  if (used + increment > limit) throw new GrowthQuotaError();

  return ent;
}

export async function incrementUsage(
  workspaceId: string,
  usageKey: string,
  amount = 1
) {
  const ent = await ensureEntitlements(workspaceId);
  const usage = { ...parseJsonRecord(ent.usage) };
  const period = currentPeriod();
  if (usage.period !== period) {
    usage.period = period;
    usage.broadcasts_sent = 0;
    usage.design_exports = 0;
    usage.lead_events = 0;
    usage.storage_bytes = getUsageNumber(ent, "storage_bytes");
  }
  const prev = typeof usage[usageKey] === "number" ? (usage[usageKey] as number) : 0;
  usage[usageKey] = prev + amount;

  return prisma.growthWorkspaceEntitlement.update({
    where: { workspaceId },
    data: { usage: usage as Prisma.InputJsonValue, refreshedAt: new Date() },
  });
}
