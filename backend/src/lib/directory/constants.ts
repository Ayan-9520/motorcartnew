import type { CommunityBusinessEntityType } from "@prisma/client";

export const DIRECTORY_CATEGORIES = {
  dealers: "dealer",
  brokers: "broker",
  dsa: "dsa",
  insurance: "insurance_agent",
  workshops: "workshop",
  parts: "parts_seller",
  influencers: "influencer",
} as const;

export type DirectoryCategorySlug = keyof typeof DIRECTORY_CATEGORIES;

export function categoryToEntityType(slug: string): CommunityBusinessEntityType | null {
  return (DIRECTORY_CATEGORIES as Record<string, CommunityBusinessEntityType>)[slug] ?? null;
}

/** Future monetization — architecture only (no billing). */
export const DIRECTORY_MONETIZATION_PLACEHOLDERS = {
  featured_businesses: {
    enabled: false,
    description: "Homepage featured carousel slots",
    max_slots: 8,
  },
  sponsored_businesses: {
    enabled: false,
    description: "Sponsored badge + boosted search rank",
    tiers: ["city", "state", "national"],
  },
  premium_listings: {
    enabled: false,
    description: "Premium profile layout + analytics",
    tiers: ["basic", "pro", "enterprise"],
  },
} as const;
