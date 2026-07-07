import { getPlanBySlug } from "./plans-catalog";
import type { BillingAccount, PlanSlug } from "./types";

export type ResolvedEntitlements = {
  plan_slug: PlanSlug;
  entity_type: string | null;
  limits: Record<string, number>;
  features: Record<string, boolean>;
};

function applyBusinessOverride(
  base: Record<string, number | boolean>,
  entityType: string | null,
  overrides: Record<string, Record<string, number>>
): Record<string, number | boolean> {
  if (!entityType || !overrides[entityType]) return { ...base };
  const next = { ...base };
  for (const [k, v] of Object.entries(overrides[entityType])) {
    next[k] = v;
  }
  return next;
}

export function resolveEntitlements(
  planSlug: PlanSlug,
  account: BillingAccount
): ResolvedEntitlements {
  const plan = getPlanBySlug(planSlug);
  if (!plan) {
    return { plan_slug: "free", entity_type: account.entity_type, limits: {}, features: {} };
  }

  const merged = applyBusinessOverride(
    plan.module_entitlements,
    account.entity_type,
    plan.business_type_overrides
  );

  const limits: Record<string, number> = {};
  const features: Record<string, boolean> = {};

  for (const [key, val] of Object.entries(merged)) {
    if (typeof val === "boolean") {
      features[key] = val;
    } else if (typeof val === "number") {
      limits[key] = val;
    }
  }

  return {
    plan_slug: planSlug,
    entity_type: account.entity_type,
    limits,
    features,
  };
}
