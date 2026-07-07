import { prisma } from "@/lib/prisma";
import { mapBusinessProfile } from "@/lib/community/map-profile";
import { categoryToEntityType, DIRECTORY_CATEGORIES } from "@/lib/directory/constants";
import { mapDirectoryBusiness } from "@/lib/directory/map-business";

function directoryCategoryForEntity(entityType: string): string | null {
  for (const [slug, type] of Object.entries(DIRECTORY_CATEGORIES)) {
    if (type === entityType) return slug;
  }
  return null;
}

async function countVehicles(entityType: string, entityId: string | null, ownerUserId: string) {
  if (entityType === "dealer" && entityId) {
    return prisma.vehicle.count({
      where: { dealerId: entityId, deletedAt: null, status: { not: "sold" } },
    });
  }
  return prisma.vehicle.count({
    where: { sellerId: ownerUserId, deletedAt: null, status: { not: "sold" } },
  });
}

async function countAuctionParticipation(entityType: string, entityId: string | null) {
  if (entityType === "dealer" && entityId) {
    return prisma.dealerAuctionEntry.count({ where: { dealerId: entityId } });
  }
  return 0;
}

export async function getBusinessHubBySlug(slug: string, viewerId?: string | null) {
  const row = await prisma.communityBusinessProfile.findFirst({ where: { slug } });
  if (!row) return null;

  const [directoryListing, growthWorkspace, vehicleCount, auctionCount] = await Promise.all([
    mapDirectoryBusiness(row, viewerId),
    row.entityId
      ? prisma.growthWorkspace.findFirst({
          where: {
            entityId: row.entityId,
            businessType: row.entityType,
            status: { not: "archived" },
          },
          include: { entitlements: true },
        })
      : prisma.growthWorkspace.findFirst({
          where: { ownerUserId: row.ownerUserId, businessType: row.entityType, status: { not: "archived" } },
          include: { entitlements: true },
        }),
    countVehicles(row.entityType, row.entityId, row.ownerUserId),
    countAuctionParticipation(row.entityType, row.entityId),
  ]);

  const category = directoryCategoryForEntity(row.entityType);

  return {
    slug: row.slug,
    read_only: true,
    community_business_profile: mapBusinessProfile(row),
    directory_listing: {
      ...directoryListing,
      directory_category: category,
      directory_path: category ? `/directory/${category}/${row.slug}` : null,
      enabled: category != null && categoryToEntityType(category) === row.entityType,
    },
    growth_workspace: growthWorkspace
      ? {
          id: growthWorkspace.id,
          slug: growthWorkspace.slug,
          name: growthWorkspace.name,
          business_type: growthWorkspace.businessType,
          entity_id: growthWorkspace.entityId,
          subscription_tier: growthWorkspace.subscriptionTier,
          status: growthWorkspace.status,
          plan_slug: growthWorkspace.entitlements?.planSlug ?? "free",
        }
      : null,
    counts: {
      vehicles: vehicleCount,
      auctions: auctionCount,
      followers: row.followerCount,
    },
  };
}
