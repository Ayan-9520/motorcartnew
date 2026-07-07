import type {
  CommunityBusinessProfile,
  CommunityUserProfile,
} from "@prisma/client";

export function mapUserProfile(p: CommunityUserProfile) {
  return {
    id: p.id,
    user_id: p.userId,
    handle: p.handle,
    display_name: p.displayName,
    bio: p.bio,
    cover_url: p.coverUrl,
    avatar_url: p.avatarUrl,
    persona: p.persona,
    location_city: p.locationCity,
    follower_count: p.followerCount,
    following_count: p.followingCount,
    post_count: p.postCount,
    is_verified: p.isVerified,
    is_private: p.isPrivate,
  };
}

export function mapBusinessProfile(b: CommunityBusinessProfile) {
  const meta =
    b.metadata && typeof b.metadata === "object" && !Array.isArray(b.metadata)
      ? (b.metadata as Record<string, unknown>)
      : {};
  const socialLinks = meta.social_links ?? meta.socialLinks ?? null;
  const verificationTier =
    meta.verification_tier != null
      ? String(meta.verification_tier)
      : b.isVerified
        ? "standard"
        : null;

  return {
    id: b.id,
    slug: b.slug,
    name: b.name,
    logo_url: b.logoUrl,
    cover_url: b.coverUrl,
    description: b.tagline,
    city: b.city,
    state: b.state,
    website: b.website,
    phone: b.phone,
    contact_email:
      meta.contact_email != null ? String(meta.contact_email) : null,
    social_links: socialLinks,
    is_verified: b.isVerified,
    verification_tier: verificationTier,
    verification_badge_placeholder: b.isVerified || !!verificationTier,
    entity_type: b.entityType,
    entity_id: b.entityId,
    owner_user_id: b.ownerUserId,
    follower_count: b.followerCount,
  };
}
