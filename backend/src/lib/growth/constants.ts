import type { GrowthBusinessType } from "@prisma/client";

export const GROWTH_WORKSPACE_HEADER = "x-growth-workspace-id";

export const GROWTH_BUSINESS_TYPES: GrowthBusinessType[] = [
  "dealer",
  "broker",
  "dsa",
  "insurance_agent",
  "workshop",
  "parts_seller",
  "influencer",
];

/** API aliases → Prisma enum */
export const GROWTH_BUSINESS_TYPE_ALIASES: Record<string, GrowthBusinessType> = {
  dealer: "dealer",
  broker: "broker",
  dsa: "dsa",
  insurance: "insurance_agent",
  insurance_agent: "insurance_agent",
  workshop: "workshop",
  parts_seller: "parts_seller",
  parts: "parts_seller",
  influencer: "influencer",
};

export const DEFAULT_GROWTH_LIMITS = {
  plan: "free",
  storage_mb: 512,
  broadcasts_monthly: 100,
  design_exports_monthly: 50,
  lead_events_monthly: 200,
  max_assets: 100,
  max_contact_lists: 5,
  max_templates: 20,
} as const;
