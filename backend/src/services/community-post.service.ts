import type { Prisma, SocialPostKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserProfile } from "@/services/community-profile.service";
import { assertCanPostToGroup } from "@/services/community-group.service";
import { CommunityError } from "@/lib/community/errors";
import { FORBIDDEN_POST_METADATA_KEYS } from "@/lib/community/constants";
import {
  parseVisibility,
  resolvePostAffiliation,
} from "@/lib/community/ownership";
import { isCommunityAdminRole } from "@/lib/community/http";

function detectEmbedProvider(url: string): string | null {
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/vimeo\.com/i.test(url)) return "vimeo";
  return "link";
}

function sanitizePostMetadata(meta?: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...(meta ?? {}) };
  for (const key of FORBIDDEN_POST_METADATA_KEYS) delete out[key];
  delete out.authorUserId;
  delete out.author_user_id;
  delete out.dealerId;
  delete out.dealer_id;
  delete out.organizationId;
  delete out.organization_id;
  return out;
}

export async function listFollowedAuthorIds(viewerId: string): Promise<string[]> {
  const [follows, legacy] = await Promise.all([
    prisma.communityFollow.findMany({
      where: { followerUserId: viewerId, targetType: "user", targetUserId: { not: null } },
      select: { targetUserId: true },
    }),
    prisma.userFollow.findMany({
      where: { followerId: viewerId },
      select: { followingId: true },
    }),
  ]);
  return [
    ...new Set([
      ...follows.map((f) => f.targetUserId).filter((id): id is string => !!id),
      ...legacy.map((f) => f.followingId),
    ]),
  ];
}

export async function canViewerSeePost(
  post: { authorId: string; visibility: string; moderationStatus: string; deletedAt: Date | null },
  viewerId: string | null,
  followedIds?: Set<string>,
): Promise<boolean> {
  if (post.deletedAt) return false;
  if (post.moderationStatus !== "approved" && post.authorId !== viewerId) return false;
  if (post.visibility === "public") return true;
  if (viewerId && post.authorId === viewerId) return true;
  if (post.visibility === "followers" && viewerId) {
    const followed = followedIds ?? new Set(await listFollowedAuthorIds(viewerId));
    return followed.has(post.authorId);
  }
  return false;
}

export async function createSocialPost(
  authorId: string,
  body: {
    content?: string;
    media?: unknown;
    post_kind?: SocialPostKind;
    poll_options?: unknown;
    poll_ends_at?: string | null;
    embed_url?: string | null;
    group_id?: string | null;
    vehicle_id?: string | null;
    dealer_id?: string | null;
    organization_id?: string | null;
    inventory_id?: string | null;
    broker_id?: string | null;
    author_id?: string | null;
    author_user_id?: string | null;
    visibility?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  if (body.author_id && body.author_id !== authorId) {
    throw new CommunityError("authorUserId is server-owned", 400, "FORGED_AUTHOR");
  }
  if (body.author_user_id && body.author_user_id !== authorId) {
    throw new CommunityError("authorUserId is server-owned", 400, "FORGED_AUTHOR");
  }

  await getOrCreateUserProfile(authorId);

  const postKind = (body.post_kind ?? "discussion") as SocialPostKind;
  const content = String(body.content ?? "").trim();
  const media = Array.isArray(body.media) ? body.media : [];
  const visibility = parseVisibility(body.visibility);

  if (!content && media.length === 0 && !body.embed_url && postKind !== "poll") {
    throw new CommunityError("Post content or media required", 400, "EMPTY_POST");
  }

  if (body.group_id) {
    await assertCanPostToGroup(body.group_id, authorId);
  }

  const affiliation = await resolvePostAffiliation(authorId, {
    dealerId: body.dealer_id ?? null,
    organizationId: body.organization_id ?? null,
    inventoryId: body.inventory_id ?? null,
  });

  if (body.vehicle_id) {
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: body.vehicle_id, deletedAt: null },
      select: { id: true },
    });
    if (!vehicle) throw new CommunityError("Vehicle not found", 404, "NOT_FOUND");
  }

  let embedProvider: string | null = null;
  let embedUrl: string | null = body.embed_url ?? null;
  if (embedUrl) embedProvider = detectEmbedProvider(embedUrl);

  const post = await prisma.$transaction(async (tx) => {
    const created = await tx.socialPost.create({
      data: {
        authorId,
        content: content || (postKind === "poll" ? "Poll" : ""),
        media,
        postKind,
        visibility,
        vehicleId: body.vehicle_id ?? null,
        dealerId: affiliation.dealerId,
        organizationId: affiliation.organizationId,
        inventoryId: affiliation.inventoryId,
        brokerId: null,
        groupId: body.group_id ?? null,
        embedProvider,
        embedUrl,
        pollOptions: body.poll_options ?? undefined,
        pollEndsAt: body.poll_ends_at ? new Date(body.poll_ends_at) : null,
        moderationStatus: "approved",
        metadata: sanitizePostMetadata(body.metadata) as Prisma.InputJsonValue,
      },
      include: {
        author: {
          select: { id: true, fullName: true, avatarUrl: true, communityProfile: true },
        },
      },
    });

    await tx.communityUserProfile.update({
      where: { userId: authorId },
      data: { postCount: { increment: 1 } },
    });

    return created;
  });

  return post;
}

export async function updateSocialPost(
  postId: string,
  actorUserId: string,
  actorRole: string,
  body: {
    content?: string;
    media?: unknown;
    visibility?: string | null;
  }
) {
  const post = await prisma.socialPost.findFirst({ where: { id: postId, deletedAt: null } });
  if (!post) throw new CommunityError("Post not found", 404, "NOT_FOUND");
  if (post.authorId !== actorUserId && !isCommunityAdminRole(actorRole)) {
    throw new CommunityError("You cannot edit this post", 403, "FORBIDDEN");
  }

  const data: Prisma.SocialPostUpdateInput = {};
  if (body.content !== undefined) {
    const content = String(body.content).trim();
    if (!content && post.postKind !== "poll") {
      throw new CommunityError("Post content or media required", 400, "EMPTY_POST");
    }
    data.content = content;
  }
  if (body.media !== undefined && Array.isArray(body.media)) data.media = body.media as Prisma.InputJsonValue;
  if (body.visibility !== undefined) data.visibility = parseVisibility(body.visibility, post.visibility as "public");

  return prisma.socialPost.update({
    where: { id: postId },
    data,
    include: {
      author: {
        select: { id: true, fullName: true, avatarUrl: true, communityProfile: true },
      },
    },
  });
}

export async function deleteSocialPost(postId: string, actorUserId: string, actorRole: string) {
  const post = await prisma.socialPost.findFirst({ where: { id: postId, deletedAt: null } });
  if (!post) throw new CommunityError("Post not found", 404, "NOT_FOUND");
  if (post.authorId !== actorUserId && !isCommunityAdminRole(actorRole)) {
    throw new CommunityError("You cannot delete this post", 403, "FORBIDDEN");
  }

  await prisma.$transaction(async (tx) => {
    await tx.socialPost.update({
      where: { id: postId },
      data: { deletedAt: new Date() },
    });
    await tx.communityUserProfile.updateMany({
      where: { userId: post.authorId, postCount: { gt: 0 } },
      data: { postCount: { decrement: 1 } },
    });
  });

  return { deleted: true, post_id: postId };
}

export async function getSocialPostById(postId: string, viewerId?: string | null) {
  const post = await prisma.socialPost.findFirst({
    where: { id: postId, deletedAt: null },
    include: {
      author: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
          communityProfile: true,
        },
      },
    },
  });
  if (!post) return null;
  if (!(await canViewerSeePost(post, viewerId ?? null))) return null;

  let likedByMe: boolean | undefined;
  let savedByMe: boolean | undefined;
  if (viewerId) {
    const [like, save] = await Promise.all([
      prisma.postLike.findUnique({ where: { postId_userId: { postId, userId: viewerId } } }),
      prisma.communitySave.findUnique({ where: { postId_userId: { postId, userId: viewerId } } }),
    ]);
    likedByMe = !!like;
    savedByMe = !!save;
  }

  return { post, likedByMe, savedByMe };
}
