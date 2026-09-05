import type { SocialPost, CommunityUserProfile, User } from "@prisma/client";

export type PostAuthorSlice = Pick<
  CommunityUserProfile,
  "handle" | "displayName" | "avatarUrl" | "persona" | "isVerified"
> | null;

export function mapPostAuthor(
  profile: PostAuthorSlice,
  user?: Pick<User, "id" | "fullName" | "avatarUrl"> | null
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

export function mapSocialPost(
  post: SocialPost,
  author?: PostAuthorSlice,
  user?: Pick<User, "id" | "fullName" | "avatarUrl"> | null,
  extras?: { liked_by_me?: boolean; saved_by_me?: boolean }
) {
  const meta =
    post.metadata && typeof post.metadata === "object" && !Array.isArray(post.metadata)
      ? (post.metadata as Record<string, unknown>)
      : {};

  return {
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
    metadata: meta,
    created_at: post.createdAt.toISOString(),
    updated_at: post.updatedAt.toISOString(),
    author: mapPostAuthor(author ?? null, user ?? null),
    ...(extras?.liked_by_me !== undefined ? { liked_by_me: extras.liked_by_me } : {}),
    ...(extras?.saved_by_me !== undefined ? { saved_by_me: extras.saved_by_me } : {}),
  };
}
