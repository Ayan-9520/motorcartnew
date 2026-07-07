import { prisma } from "@/lib/prisma";
import { formatAuthUser } from "@/lib/auth/format-user";
import { mapBusinessProfile, mapUserProfile } from "@/lib/community/map-profile";
import { mapDirectoryBusiness } from "@/lib/directory/map-business";
import { DIRECTORY_CATEGORIES } from "@/lib/directory/constants";

function mapGrowthWorkspace(ws: {
  id: string;
  slug: string;
  name: string;
  businessType: string;
  entityId: string | null;
  subscriptionTier: string;
  status: string;
  createdAt: Date;
}) {
  return {
    id: ws.id,
    slug: ws.slug,
    name: ws.name,
    business_type: ws.businessType,
    entity_id: ws.entityId,
    subscription_tier: ws.subscriptionTier,
    status: ws.status,
    created_at: ws.createdAt.toISOString(),
  };
}

function directoryCategoryForEntity(entityType: string): string | null {
  for (const [slug, type] of Object.entries(DIRECTORY_CATEGORIES)) {
    if (type === entityType) return slug;
  }
  return null;
}

export async function getEcosystemContext(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const [communityProfile, businessProfiles, growthWorkspaces, roleAssignments] =
    await Promise.all([
      prisma.communityUserProfile.findFirst({ where: { userId } }),
      prisma.communityBusinessProfile.findMany({
        where: { ownerUserId: userId },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.growthWorkspace.findMany({
        where: { ownerUserId: userId, status: { not: "archived" } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.communityRoleAssignment.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const directoryProfiles = await Promise.all(
    businessProfiles.map((b) => mapDirectoryBusiness(b, userId))
  );

  const businessTypes = [...new Set(businessProfiles.map((b) => b.entityType))];

  return {
    user: formatAuthUser(user),
    roles: {
      primary: user.role,
      app_role: user.role,
      community_assignments: roleAssignments.map((r) => ({
        scope: r.scope,
        scope_id: r.scopeId,
        role: r.role,
      })),
      business_entity_types: businessTypes,
    },
    business_profiles: businessProfiles.map(mapBusinessProfile),
    community_profiles: communityProfile ? [mapUserProfile(communityProfile)] : [],
    growth_workspaces: growthWorkspaces.map(mapGrowthWorkspace),
    directory_profiles: directoryProfiles.map((d) => ({
      ...d,
      directory_category: directoryCategoryForEntity(String(d.entity_type)),
      directory_path: directoryCategoryForEntity(String(d.entity_type))
        ? `/directory/${directoryCategoryForEntity(String(d.entity_type))}/${d.slug}`
        : null,
    })),
  };
}
