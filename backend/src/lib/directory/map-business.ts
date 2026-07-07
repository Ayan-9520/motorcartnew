import type { CommunityBusinessProfile } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { readMonetizationMeta } from "@/lib/directory/monetization-meta";

function metaOf(b: CommunityBusinessProfile): Record<string, unknown> {
  if (b.metadata && typeof b.metadata === "object" && !Array.isArray(b.metadata)) {
    return b.metadata as Record<string, unknown>;
  }
  return {};
}

export async function mapDirectoryBusiness(
  b: CommunityBusinessProfile,
  viewerId?: string | null
) {
  const meta = metaOf(b);
  const monetization = readMonetizationMeta(b);
  let is_following = false;
  if (viewerId) {
    const follow = await prisma.communityFollow.findFirst({
      where: {
        followerUserId: viewerId,
        targetType: "business",
        targetBusinessId: b.id,
      },
    });
    is_following = !!follow;
  }

  let growth_workspace: { id: string; slug: string; name: string } | null = null;
  if (b.entityId) {
    const ws = await prisma.growthWorkspace.findFirst({
      where: { entityId: b.entityId, businessType: b.entityType, status: "active" },
      select: { id: true, slug: true, name: true },
    });
    if (ws) growth_workspace = ws;
  }

  return {
    id: b.id,
    slug: b.slug,
    name: b.name,
    entity_type: b.entityType,
    entity_id: b.entityId,
    owner_user_id: b.ownerUserId,
    tagline: b.tagline,
    logo_url: b.logoUrl,
    cover_url: b.coverUrl,
    city: b.city,
    state: b.state,
    website: b.website,
    phone: b.phone,
    is_verified: b.isVerified,
    follower_count: b.followerCount,
    about: meta.about != null ? String(meta.about) : null,
    services: Array.isArray(meta.services) ? meta.services : [],
    contact: meta.contact && typeof meta.contact === "object" ? meta.contact : null,
    social_links: meta.social_links ?? meta.socialLinks ?? null,
    verification_tier: meta.verification_tier != null ? String(meta.verification_tier) : null,
    growth_workspace,
    monetization: {
      featured: monetization.featured ?? false,
      featured_category: monetization.featured_category,
      sponsored: monetization.sponsored ?? false,
      sponsored_tier: monetization.sponsored_tier,
      premium_listing: monetization.premium_listing ?? false,
      premium_tier: monetization.premium_tier,
      verification_badge: monetization.verification_badge,
    },
    monetization_flags: {
      featured_eligible: monetization.featured_eligible === true,
      sponsored_eligible: monetization.sponsored_eligible === true,
      premium_eligible: monetization.premium_eligible === true,
    },
    viewer: { is_following },
  };
}
