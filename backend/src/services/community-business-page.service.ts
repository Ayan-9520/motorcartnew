import { prisma } from "@/lib/prisma";
import { mapBusinessProfile } from "@/lib/community/map-profile";
import {
  getBusinessBySlug,
  getBusinessByEntity,
} from "@/services/community-profile.service";

export async function getBusinessPageBySlug(slug: string, viewerId?: string | null) {
  const business = await getBusinessBySlug(slug);
  if (!business) return null;

  let is_following = false;
  if (viewerId) {
    const follow = await prisma.communityFollow.findFirst({
      where: {
        followerUserId: viewerId,
        targetType: "business",
        targetBusinessId: business.id,
      },
    });
    is_following = !!follow;
  }

  return {
    profile: mapBusinessProfile(business),
    viewer: {
      is_following,
      can_post: viewerId === business.ownerUserId,
    },
  };
}

export async function getBusinessPageByEntity(
  entityType: string,
  entityId: string,
  viewerId?: string | null
) {
  const business = await getBusinessByEntity(entityType, entityId);
  if (!business) return null;
  return getBusinessPageBySlug(business.slug, viewerId);
}
