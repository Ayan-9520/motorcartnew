import type {
  CommunityBusinessProfile,
  CommunityUserProfile,
  SocialPost,
  User,
} from "@prisma/client";
import { COMMUNITY_PII_KEYS } from "./constants";

const PII_KEY_SET = new Set<string>(COMMUNITY_PII_KEYS);

export function stripCommunityPii<T extends Record<string, unknown>>(input: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (PII_KEY_SET.has(key)) continue;
    out[key] = value;
  }
  return out as T;
}

export function assertPublicSafeCommunityPayload(payload: Record<string, unknown>) {
  for (const key of COMMUNITY_PII_KEYS) {
    if (payload[key] != null && payload[key] !== "") {
      throw new Error(`Community payload leaked PII key: ${key}`);
    }
  }
}

export function mapPublicUserProfile(
  p: CommunityUserProfile,
  extras?: { is_following?: boolean; is_self?: boolean },
) {
  return stripCommunityPii({
    id: p.id,
    user_id: p.userId,
    handle: p.handle,
    display_name: p.displayName,
    headline: p.headline,
    bio: p.bio,
    cover_url: p.coverUrl,
    avatar_url: p.avatarUrl,
    persona: p.persona,
    profile_type: p.profileType,
    location_city: p.locationCity,
    location_state: p.locationState,
    dealer_id: p.dealerId,
    organization_id: p.organizationId,
    follower_count: p.followerCount,
    following_count: p.followingCount,
    post_count: p.postCount,
    is_verified: p.isVerified,
    is_private: p.isPrivate,
    ...(extras?.is_following !== undefined ? { is_following: extras.is_following } : {}),
    ...(extras?.is_self !== undefined ? { is_self: extras.is_self } : {}),
  });
}

export function mapPublicBusinessProfile(b: CommunityBusinessProfile) {
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

  return stripCommunityPii({
    id: b.id,
    slug: b.slug,
    name: b.name,
    logo_url: b.logoUrl,
    cover_url: b.coverUrl,
    description: b.tagline,
    city: b.city,
    state: b.state,
    website: b.website,
    is_verified: b.isVerified,
    verification_tier: verificationTier,
    entity_type: b.entityType,
    entity_id: b.entityId,
    owner_user_id: b.ownerUserId,
    follower_count: b.followerCount,
    social_links: socialLinks,
  });
}

export function mapPublicSocialPost(
  post: SocialPost,
  author?: {
    handle: string | null;
    display_name: string;
    avatar_url: string | null;
    persona?: string;
    is_verified?: boolean;
    id?: string;
  } | null,
  extras?: { liked_by_me?: boolean; saved_by_me?: boolean },
) {
  return stripCommunityPii({
    id: post.id,
    author_id: post.authorId,
    content: post.content,
    media: post.media,
    post_kind: post.postKind,
    visibility: post.visibility,
    vehicle_id: post.vehicleId,
    dealer_id: post.dealerId,
    organization_id: post.organizationId,
    inventory_id: post.inventoryId,
    broker_id: post.brokerId,
    group_id: post.groupId,
    embed_provider: post.embedProvider,
    embed_url: post.embedUrl,
    poll_options: post.pollOptions,
    poll_ends_at: post.pollEndsAt?.toISOString() ?? null,
    like_count: post.likeCount,
    comment_count: post.commentCount,
    share_count: post.shareCount,
    moderation_status: post.moderationStatus,
    created_at: post.createdAt.toISOString(),
    updated_at: post.updatedAt.toISOString(),
    author: author ?? null,
    ...(extras?.liked_by_me !== undefined ? { liked_by_me: extras.liked_by_me } : {}),
    ...(extras?.saved_by_me !== undefined ? { saved_by_me: extras.saved_by_me } : {}),
  });
}

export function authorFromUser(
  user?: Pick<User, "id" | "fullName" | "avatarUrl"> | null,
  profile?: {
    handle: string;
    displayName: string;
    avatarUrl: string | null;
    persona: string;
    isVerified: boolean;
  } | null,
) {
  if (profile) {
    return {
      id: user?.id,
      handle: profile.handle,
      display_name: profile.displayName,
      avatar_url: profile.avatarUrl,
      persona: profile.persona,
      is_verified: profile.isVerified,
    };
  }
  if (user) {
    return {
      id: user.id,
      handle: null,
      display_name: user.fullName,
      avatar_url: user.avatarUrl,
      persona: "customer",
      is_verified: false,
    };
  }
  return null;
}
