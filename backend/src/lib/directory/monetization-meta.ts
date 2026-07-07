import type { CommunityBusinessProfile } from "@prisma/client";

export type BusinessMonetizationMeta = {
  featured?: boolean;
  featured_category?: string | null;
  sponsored?: boolean;
  sponsored_tier?: string | null;
  premium_listing?: boolean;
  premium_tier?: string | null;
  verification_badge?: string | null;
  featured_eligible?: boolean;
  sponsored_eligible?: boolean;
  premium_eligible?: boolean;
};

export function readMonetizationMeta(b: CommunityBusinessProfile): BusinessMonetizationMeta {
  const raw =
    b.metadata && typeof b.metadata === "object" && !Array.isArray(b.metadata)
      ? (b.metadata as Record<string, unknown>)
      : {};
  return {
    featured: raw.featured === true,
    featured_category: raw.featured_category != null ? String(raw.featured_category) : null,
    sponsored: raw.sponsored === true,
    sponsored_tier: raw.sponsored_tier != null ? String(raw.sponsored_tier) : null,
    premium_listing: raw.premium_listing === true,
    premium_tier: raw.premium_tier != null ? String(raw.premium_tier) : null,
    verification_badge:
      raw.verification_badge != null
        ? String(raw.verification_badge)
        : b.isVerified
          ? "verified"
          : null,
    featured_eligible: raw.featured_eligible === true,
    sponsored_eligible: raw.sponsored_eligible === true,
    premium_eligible: raw.premium_eligible === true,
  };
}

export function mergeMonetizationMeta(
  current: unknown,
  patch: Partial<BusinessMonetizationMeta>
): Record<string, unknown> {
  const base =
    current && typeof current === "object" && !Array.isArray(current)
      ? { ...(current as Record<string, unknown>) }
      : {};
  return { ...base, ...patch };
}
