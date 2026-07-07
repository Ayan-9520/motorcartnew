import type { CommunityBusinessEntityType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DIRECTORY_CATEGORIES, DIRECTORY_MONETIZATION_PLACEHOLDERS } from "@/lib/directory/constants";
import {
  mergeMonetizationMeta,
  readMonetizationMeta,
  type BusinessMonetizationMeta,
} from "@/lib/directory/monetization-meta";
import { mapDirectoryBusiness } from "@/lib/directory/map-business";

function matchesFeatured(meta: ReturnType<typeof readMonetizationMeta>, category?: string) {
  if (!meta.featured) return false;
  if (!category) return true;
  return !meta.featured_category || meta.featured_category === category;
}

export function getMonetizationConfig() {
  return {
    payment_gateway_enabled: false,
    billing_enabled: false,
    placeholders: DIRECTORY_MONETIZATION_PLACEHOLDERS,
    featured_categories: Object.keys(DIRECTORY_CATEGORIES),
    sponsored_tiers: ["city", "state", "national"],
    premium_tiers: ["basic", "pro", "enterprise"],
    verification_badges: ["verified", "premium_verified", "partner"],
  };
}

export async function listFeaturedBusinesses(
  categorySlug?: string,
  limit = 20
) {
  const entityType = categorySlug
    ? (DIRECTORY_CATEGORIES as Record<string, CommunityBusinessEntityType>)[categorySlug]
    : undefined;

  const rows = await prisma.communityBusinessProfile.findMany({
    where: entityType ? { entityType } : undefined,
    orderBy: [{ isVerified: "desc" }, { followerCount: "desc" }],
    take: 200,
  });

  const filtered = rows
    .filter((r) => matchesFeatured(readMonetizationMeta(r), categorySlug))
    .slice(0, limit);

  return Promise.all(filtered.map((r) => mapDirectoryBusiness(r)));
}

export async function listSponsoredBusinesses(limit = 30) {
  const rows = await prisma.communityBusinessProfile.findMany({
    orderBy: { followerCount: "desc" },
    take: 200,
  });
  const filtered = rows
    .filter((r) => readMonetizationMeta(r).sponsored)
    .slice(0, limit);
  return Promise.all(filtered.map((r) => mapDirectoryBusiness(r)));
}

export async function listPremiumListings(limit = 30) {
  const rows = await prisma.communityBusinessProfile.findMany({
    take: 200,
    orderBy: { updatedAt: "desc" },
  });
  const filtered = rows
    .filter((r) => readMonetizationMeta(r).premium_listing)
    .slice(0, limit);
  return Promise.all(filtered.map((r) => mapDirectoryBusiness(r)));
}

export async function listVerifiedBadgeBusinesses(limit = 50) {
  const rows = await prisma.communityBusinessProfile.findMany({
    where: { isVerified: true },
    take: limit,
    orderBy: { followerCount: "desc" },
  });
  return Promise.all(rows.map((r) => mapDirectoryBusiness(r)));
}

export async function setBusinessMonetization(
  businessId: string,
  patch: Partial<BusinessMonetizationMeta>
) {
  const row = await prisma.communityBusinessProfile.findFirst({ where: { id: businessId } });
  if (!row) return null;

  const meta = mergeMonetizationMeta(row.metadata, patch);
  const isVerified =
    patch.verification_badge !== undefined
      ? patch.verification_badge === "verified" ||
        patch.verification_badge === "premium_verified"
      : undefined;

  const updated = await prisma.communityBusinessProfile.update({
    where: { id: businessId },
    data: {
      metadata: meta as Prisma.InputJsonValue,
      ...(isVerified !== undefined ? { isVerified } : {}),
    },
  });

  return mapDirectoryBusiness(updated);
}
