import { CommercialError } from "./errors";

export type AchievementSlab = {
  minInclusive: number;
  maxExclusive: number | null;
  percent: number;
};

function money(n: number) {
  return Math.round(n * 100) / 100;
}

/** No default slabs or percentages. */
export function applyAchievementSlab(achievement: number, slabs: AchievementSlab[]) {
  if (!slabs.length) throw new CommercialError("No payout slabs configured", 400, "NO_SLABS_CONFIGURED");
  const match = slabs.find(
    (s) => achievement >= s.minInclusive && (s.maxExclusive == null || achievement < s.maxExclusive),
  );
  if (!match) throw new CommercialError("Achievement does not match a configured slab", 400, "NO_MATCHING_SLAB");
  return { slab: match, grossExpected: money((achievement * match.percent) / 100) };
}

export function partnerShareSplit(grossRealized: number, partnerSharePercent: number | null | undefined) {
  if (partnerSharePercent == null || !Number.isFinite(Number(partnerSharePercent))) {
    throw new CommercialError("Partner share percent is not configured", 400, "SHARE_NOT_CONFIGURED");
  }
  const partner = money((grossRealized * Number(partnerSharePercent)) / 100);
  return { partnerEligible: partner, motorcartRetained: money(grossRealized - partner) };
}

export function classifyReconciliation(expected: number, received: number) {
  const difference = money(received - expected);
  if (Math.abs(difference) < 0.01) return { status: "MATCHED" as const, difference };
  if (received <= 0) return { status: "UNMATCHED" as const, difference };
  if (received > 0 && received < expected) return { status: "PARTIAL" as const, difference };
  return { status: "MISMATCH" as const, difference };
}
