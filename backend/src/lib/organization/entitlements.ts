/** Plan → feature entitlements. Billing/payments are not implemented. */

export const PARTNER_PLAN_SLUGS = ["free", "starter", "pro", "premium", "enterprise"] as const;
export type PartnerPlanSlug = (typeof PARTNER_PLAN_SLUGS)[number];

export const PARTNER_FEATURE_KEYS = [
  "inventory_upload",
  "bulk_excel_upload",
  "lead_management",
  "lead_board",
  "paid_leads",
  "crm",
  "dialer",
  "ai_calling",
  "analytics",
  "finance_leads",
  "insurance_leads",
  "service_leads",
  "parts_leads",
  "community_marketing",
  "advanced_profile",
  "verified_badge",
] as const;

export type PartnerFeatureKey = (typeof PARTNER_FEATURE_KEYS)[number];

/** Future-phase features: never granted by any plan in Phase 3. */
export const PHASE_LOCKED_FEATURES = new Set<PartnerFeatureKey>([
  "lead_board",
  "paid_leads",
  "dialer",
  "ai_calling",
]);

const PLAN_FEATURES: Record<PartnerPlanSlug, PartnerFeatureKey[]> = {
  free: ["inventory_upload", "lead_management"],
  starter: ["inventory_upload", "lead_management", "crm", "analytics"],
  pro: [
    "inventory_upload",
    "lead_management",
    "crm",
    "analytics",
    "bulk_excel_upload",
    "finance_leads",
    "insurance_leads",
    "advanced_profile",
  ],
  premium: [
    "inventory_upload",
    "lead_management",
    "crm",
    "analytics",
    "bulk_excel_upload",
    "finance_leads",
    "insurance_leads",
    "advanced_profile",
    "service_leads",
    "parts_leads",
    "community_marketing",
    "verified_badge",
  ],
  enterprise: [
    "inventory_upload",
    "lead_management",
    "crm",
    "analytics",
    "bulk_excel_upload",
    "finance_leads",
    "insurance_leads",
    "advanced_profile",
    "service_leads",
    "parts_leads",
    "community_marketing",
    "verified_badge",
  ],
};

export const PARTNER_PLANS: { slug: PartnerPlanSlug; name: string; sortOrder: number }[] = [
  { slug: "free", name: "Free", sortOrder: 0 },
  { slug: "starter", name: "Starter", sortOrder: 1 },
  { slug: "pro", name: "Pro", sortOrder: 2 },
  { slug: "premium", name: "Premium", sortOrder: 3 },
  { slug: "enterprise", name: "Enterprise", sortOrder: 4 },
];

export const FEATURE_UNLOCK_HINT: Record<PartnerFeatureKey, string> = {
  inventory_upload: "Included",
  bulk_excel_upload: "Available in Pro",
  lead_management: "Included",
  lead_board: "Coming in a later phase",
  paid_leads: "Coming in a later phase",
  crm: "Available in Starter",
  dialer: "Coming in a later phase",
  ai_calling: "Coming in a later phase",
  analytics: "Available in Starter",
  finance_leads: "Available in Pro",
  insurance_leads: "Available in Pro",
  service_leads: "Available in Premium",
  parts_leads: "Available in Premium",
  community_marketing: "Available in Premium",
  advanced_profile: "Available in Pro",
  verified_badge: "Available in Premium",
};

export function isPartnerPlanSlug(value: string): value is PartnerPlanSlug {
  return (PARTNER_PLAN_SLUGS as readonly string[]).includes(value);
}

export function isPartnerFeatureKey(value: string): value is PartnerFeatureKey {
  return (PARTNER_FEATURE_KEYS as readonly string[]).includes(value);
}

export type FeatureOverride = { featureKey: string; granted: boolean };

export type FeatureEntitlementView = {
  key: PartnerFeatureKey;
  active: boolean;
  locked: boolean;
  hint: string;
};

export function planIncludesFeature(plan: PartnerPlanSlug, feature: PartnerFeatureKey): boolean {
  if (PHASE_LOCKED_FEATURES.has(feature)) return false;
  return PLAN_FEATURES[plan].includes(feature);
}

export function resolveFeatureEntitlement(
  plan: PartnerPlanSlug,
  feature: PartnerFeatureKey,
  overrides: FeatureOverride[] = [],
): boolean {
  if (PHASE_LOCKED_FEATURES.has(feature)) return false;
  const override = overrides.find((o) => o.featureKey === feature);
  if (override) return override.granted;
  return planIncludesFeature(plan, feature);
}

export function listFeatureEntitlements(
  plan: PartnerPlanSlug,
  overrides: FeatureOverride[] = [],
): FeatureEntitlementView[] {
  return PARTNER_FEATURE_KEYS.map((key) => {
    const active = resolveFeatureEntitlement(plan, key, overrides);
    return {
      key,
      active,
      locked: !active,
      hint: active ? "Active" : FEATURE_UNLOCK_HINT[key],
    };
  });
}
