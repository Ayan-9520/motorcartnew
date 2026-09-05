import { prisma } from "@/lib/prisma";
import { getOrCreateUserProfile } from "@/services/community-profile.service";
import { CommunityError } from "@/lib/community/errors";
import { isCommunityAdminRole } from "@/lib/community/http";
import { notifyCommunityOnce } from "@/lib/community/notify";
import { COMMUNITY_REPORT_TARGETS } from "@/lib/community/constants";

export async function likePost(postId: string, userId: string) {
  const post = await prisma.socialPost.findFirst({
    where: { id: postId, deletedAt: null },
  });
  if (!post) return null;

  const existing = await prisma.postLike.findUnique({
    where: { postId_userId: { postId, userId } },
  });
  if (existing) {
    throw new CommunityError("Already liked", 409, "DUPLICATE_LIKE");
  }

  await prisma.$transaction(async (tx) => {
    await tx.postLike.create({ data: { postId, userId } });
    await tx.socialPost.update({
      where: { id: postId },
      data: { likeCount: { increment: 1 } },
    });
  });

  await notifyCommunityOnce({
    recipientUserId: post.authorId,
    actorUserId: userId,
    title: "New like",
    body: "Someone liked your post.",
    event: "post_like",
    targetId: postId,
    postId,
  });

  return prisma.socialPost.findUnique({ where: { id: postId } });
}

export async function unlikePost(postId: string, userId: string) {
  const post = await prisma.socialPost.findFirst({
    where: { id: postId, deletedAt: null },
  });
  if (!post) return null;

  await prisma.$transaction(async (tx) => {
    const deleted = await tx.postLike.deleteMany({
      where: { postId, userId },
    });
    if (deleted.count > 0) {
      await tx.socialPost.update({
        where: { id: postId },
        data: { likeCount: { decrement: 1 } },
      });
    }
  });

  return prisma.socialPost.findUnique({ where: { id: postId } });
}

export async function listPostComments(postId: string, limit = 50) {
  const post = await prisma.socialPost.findFirst({
    where: { id: postId, deletedAt: null },
  });
  if (!post) return null;

  const comments = await prisma.postComment.findMany({
    where: { postId, hidden: false },
    orderBy: { createdAt: "asc" },
    take: Math.min(limit, 100),
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
          communityProfile: true,
        },
      },
    },
  });

  return comments.map((c) => ({
    id: c.id,
    post_id: c.postId,
    user_id: c.userId,
    parent_id: null,
    content: c.content,
    created_at: c.createdAt.toISOString(),
    updated_at: c.updatedAt.toISOString(),
    author: c.user.communityProfile
      ? {
          handle: c.user.communityProfile.handle,
          display_name: c.user.communityProfile.displayName,
          avatar_url: c.user.communityProfile.avatarUrl,
        }
      : {
          handle: null,
          display_name: c.user.fullName,
          avatar_url: c.user.avatarUrl,
        },
  }));
}

export async function addPostComment(
  postId: string,
  userId: string,
  content: string,
) {
  const text = content.trim();
  if (!text) throw new CommunityError("Comment content required", 400, "EMPTY_COMMENT");

  const post = await prisma.socialPost.findFirst({
    where: { id: postId, deletedAt: null },
  });
  if (!post) return null;

  const comment = await prisma.$transaction(async (tx) => {
    const created = await tx.postComment.create({
      data: {
        postId,
        userId,
        content: text,
        parentId: null,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            communityProfile: true,
          },
        },
      },
    });

    await tx.socialPost.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 } },
    });

    return created;
  });

  await notifyCommunityOnce({
    recipientUserId: post.authorId,
    actorUserId: userId,
    title: "New comment",
    body: "Someone commented on your post.",
    event: "post_comment",
    targetId: comment.id,
    postId,
  });

  return comment;
}

export async function updatePostComment(
  commentId: string,
  actorUserId: string,
  actorRole: string,
  content: string,
) {
  const text = content.trim();
  if (!text) throw new CommunityError("Comment content required", 400, "EMPTY_COMMENT");

  const comment = await prisma.postComment.findFirst({ where: { id: commentId, hidden: false } });
  if (!comment) throw new CommunityError("Comment not found", 404, "NOT_FOUND");
  if (comment.userId !== actorUserId && !isCommunityAdminRole(actorRole)) {
    throw new CommunityError("You cannot edit this comment", 403, "FORBIDDEN");
  }

  return prisma.postComment.update({
    where: { id: commentId },
    data: { content: text },
  });
}

export async function deletePostComment(commentId: string, actorUserId: string, actorRole: string) {
  const comment = await prisma.postComment.findFirst({ where: { id: commentId, hidden: false } });
  if (!comment) throw new CommunityError("Comment not found", 404, "NOT_FOUND");
  if (comment.userId !== actorUserId && !isCommunityAdminRole(actorRole)) {
    throw new CommunityError("You cannot delete this comment", 403, "FORBIDDEN");
  }

  await prisma.$transaction(async (tx) => {
    await tx.postComment.update({
      where: { id: commentId },
      data: { hidden: true },
    });
    await tx.socialPost.updateMany({
      where: { id: comment.postId, commentCount: { gt: 0 } },
      data: { commentCount: { decrement: 1 } },
    });
  });

  return { deleted: true, comment_id: commentId };
}

export async function sharePost(postId: string, userId: string) {
  const post = await prisma.socialPost.findFirst({
    where: { id: postId, deletedAt: null },
  });
  if (!post) return null;

  const existing = await prisma.postShare.findFirst({
    where: { postId, userId },
  });
  if (existing) {
    throw new CommunityError("Already shared", 409, "DUPLICATE_SHARE");
  }

  await prisma.$transaction(async (tx) => {
    await tx.postShare.create({ data: { postId, userId } });
    await tx.socialPost.update({
      where: { id: postId },
      data: { shareCount: { increment: 1 } },
    });
  });

  await notifyCommunityOnce({
    recipientUserId: post.authorId,
    actorUserId: userId,
    title: "Post shared",
    body: "Someone shared your post in MotorCart Community.",
    event: "post_share",
    targetId: postId,
    postId,
  });

  return prisma.socialPost.findUnique({ where: { id: postId } });
}

export async function savePost(postId: string, userId: string) {
  const post = await prisma.socialPost.findFirst({
    where: { id: postId, deletedAt: null },
  });
  if (!post) throw new CommunityError("Post not found", 404, "NOT_FOUND");

  const existing = await prisma.communitySave.findUnique({
    where: { postId_userId: { postId, userId } },
  });
  if (existing) throw new CommunityError("Already saved", 409, "DUPLICATE_SAVE");

  await prisma.communitySave.create({ data: { postId, userId } });
  return { saved: true, post_id: postId };
}

export async function unsavePost(postId: string, userId: string) {
  await prisma.communitySave.deleteMany({ where: { postId, userId } });
  return { saved: false, post_id: postId };
}

export async function listSavedPosts(userId: string, limit = 20, cursor?: string | null) {
  const take = Math.min(Math.max(limit, 1), 50);
  const cursorDate = cursor ? new Date(cursor) : null;
  const saves = await prisma.communitySave.findMany({
    where: {
      userId,
      ...(cursorDate && !Number.isNaN(cursorDate.getTime()) ? { createdAt: { lt: cursorDate } } : {}),
      post: { deletedAt: null },
    },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      post: {
        include: {
          author: {
            select: { id: true, fullName: true, avatarUrl: true, communityProfile: true },
          },
        },
      },
    },
  });

  const next =
    saves.length === take ? saves[saves.length - 1]?.createdAt.toISOString() ?? null : null;

  return {
    items: saves.map((s) => ({ post: s.post, liked_by_me: undefined, saved_by_me: true })),
    next_cursor: next,
  };
}

export async function createCommunityReport(
  reporterUserId: string,
  input: { target_type?: string; target_id?: string; reason?: string; details?: string | null },
) {
  const targetType = String(input.target_type ?? "").toLowerCase();
  if (!(COMMUNITY_REPORT_TARGETS as readonly string[]).includes(targetType)) {
    throw new CommunityError("Invalid report target", 400, "INVALID_TARGET");
  }
  const targetId = String(input.target_id ?? "").trim();
  const reason = String(input.reason ?? "").trim();
  if (!targetId || !reason) throw new CommunityError("Report target and reason are required", 400);

  if (targetType === "post") {
    const post = await prisma.socialPost.findFirst({ where: { id: targetId, deletedAt: null }, select: { id: true } });
    if (!post) throw new CommunityError("Post not found", 404, "NOT_FOUND");
  } else if (targetType === "comment") {
    const comment = await prisma.postComment.findFirst({ where: { id: targetId }, select: { id: true } });
    if (!comment) throw new CommunityError("Comment not found", 404, "NOT_FOUND");
  } else {
    const profile = await prisma.communityUserProfile.findFirst({
      where: { OR: [{ id: targetId }, { userId: targetId }] },
      select: { id: true },
    });
    if (!profile) throw new CommunityError("Profile not found", 404, "NOT_FOUND");
  }

  const report = await prisma.communityReport.create({
    data: {
      reporterUserId,
      targetType,
      targetId,
      reason: reason.slice(0, 500),
      details: input.details != null ? String(input.details).slice(0, 2000) : null,
      status: "OPEN",
    },
  });

  return {
    id: report.id,
    target_type: report.targetType,
    target_id: report.targetId,
    reason: report.reason,
    status: report.status,
    created_at: report.createdAt.toISOString(),
  };
}

export type FollowTarget = {
  target_type: "user" | "business";
  target_user_id?: string;
  target_business_id?: string;
};

export async function followTarget(followerUserId: string, target: FollowTarget) {
  await getOrCreateUserProfile(followerUserId);

  if (target.target_type === "user") {
    const targetUserId = target.target_user_id;
    if (!targetUserId) throw new CommunityError("Missing target id", 400, "MISSING_TARGET");
    if (targetUserId === followerUserId) {
      throw new CommunityError("Cannot follow yourself", 400, "SELF_FOLLOW");
    }

    const targetUser = await prisma.user.findFirst({ where: { id: targetUserId, deletedAt: null } });
    if (!targetUser) throw new CommunityError("Target not found", 404, "TARGET_NOT_FOUND");
    await getOrCreateUserProfile(targetUserId);

    const exists = await prisma.communityFollow.findFirst({
      where: { followerUserId, targetType: "user", targetUserId },
    });
    if (exists) throw new CommunityError("Already following", 409, "DUPLICATE_FOLLOW");

    await prisma.$transaction(async (tx) => {
      await tx.communityFollow.create({
        data: {
          followerUserId,
          targetType: "user",
          targetUserId,
        },
      });

      await tx.userFollow.upsert({
        where: {
          followerId_followingId: {
            followerId: followerUserId,
            followingId: targetUserId,
          },
        },
        create: { followerId: followerUserId, followingId: targetUserId },
        update: {},
      });

      await tx.communityUserProfile.update({
        where: { userId: targetUserId },
        data: { followerCount: { increment: 1 } },
      });
      await tx.communityUserProfile.update({
        where: { userId: followerUserId },
        data: { followingCount: { increment: 1 } },
      });
    });

    await notifyCommunityOnce({
      recipientUserId: targetUserId,
      actorUserId: followerUserId,
      title: "New follower",
      body: "Someone started following you on MotorCart Community.",
      event: "new_follower",
      targetId: followerUserId,
      deepLink: `/community/u/${followerUserId}`,
    });

    return { followed: true, target_type: "user", target_user_id: targetUserId };
  }

  if (target.target_type === "business") {
    const targetBusinessId = target.target_business_id;
    if (!targetBusinessId) throw new CommunityError("Missing target id", 400, "MISSING_TARGET");

    const business = await prisma.communityBusinessProfile.findUnique({
      where: { id: targetBusinessId },
    });
    if (!business) throw new CommunityError("Target not found", 404, "TARGET_NOT_FOUND");

    const exists = await prisma.communityFollow.findFirst({
      where: { followerUserId, targetType: "business", targetBusinessId },
    });
    if (exists) throw new CommunityError("Already following", 409, "DUPLICATE_FOLLOW");

    await prisma.$transaction(async (tx) => {
      await tx.communityFollow.create({
        data: {
          followerUserId,
          targetType: "business",
          targetBusinessId,
        },
      });

      await tx.communityBusinessProfile.update({
        where: { id: targetBusinessId },
        data: { followerCount: { increment: 1 } },
      });
    });

    return {
      followed: true,
      target_type: "business",
      target_business_id: targetBusinessId,
    };
  }

  throw new CommunityError("Invalid follow target", 400, "INVALID_TARGET");
}

export async function unfollowTarget(followerUserId: string, target: FollowTarget) {
  if (target.target_type === "user") {
    const targetUserId = target.target_user_id;
    if (!targetUserId) throw new CommunityError("Missing target id", 400, "MISSING_TARGET");

    await prisma.$transaction(async (tx) => {
      const removed = await tx.communityFollow.deleteMany({
        where: {
          followerUserId,
          targetType: "user",
          targetUserId,
        },
      });
      if (removed.count === 0) return;

      await tx.userFollow.deleteMany({
        where: { followerId: followerUserId, followingId: targetUserId },
      });

      await tx.communityUserProfile.updateMany({
        where: { userId: targetUserId, followerCount: { gt: 0 } },
        data: { followerCount: { decrement: 1 } },
      });
      await tx.communityUserProfile.updateMany({
        where: { userId: followerUserId, followingCount: { gt: 0 } },
        data: { followingCount: { decrement: 1 } },
      });
    });

    return { unfollowed: true, target_type: "user", target_user_id: targetUserId };
  }

  if (target.target_type === "business") {
    const targetBusinessId = target.target_business_id;
    if (!targetBusinessId) throw new CommunityError("Missing target id", 400, "MISSING_TARGET");

    await prisma.$transaction(async (tx) => {
      const removed = await tx.communityFollow.deleteMany({
        where: {
          followerUserId,
          targetType: "business",
          targetBusinessId,
        },
      });
      if (removed.count === 0) return;

      await tx.communityBusinessProfile.updateMany({
        where: { id: targetBusinessId, followerCount: { gt: 0 } },
        data: { followerCount: { decrement: 1 } },
      });
    });

    return {
      unfollowed: true,
      target_type: "business",
      target_business_id: targetBusinessId,
    };
  }

  throw new CommunityError("Invalid follow target", 400, "INVALID_TARGET");
}

export async function followUserById(followerUserId: string, targetUserId: string) {
  return followTarget(followerUserId, { target_type: "user", target_user_id: targetUserId });
}

export async function unfollowUserById(followerUserId: string, targetUserId: string) {
  return unfollowTarget(followerUserId, { target_type: "user", target_user_id: targetUserId });
}

function mapFollowProfile(row: {
  userId: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  headline: string | null;
  profileType: string;
  locationCity: string | null;
  locationState: string | null;
  followerCount: number;
}) {
  return {
    user_id: row.userId,
    handle: row.handle,
    display_name: row.displayName,
    avatar_url: row.avatarUrl,
    headline: row.headline,
    profile_type: row.profileType,
    location_city: row.locationCity,
    location_state: row.locationState,
    follower_count: row.followerCount,
  };
}

export async function listFollowers(userId: string, limit = 30) {
  await getOrCreateUserProfile(userId);
  const take = Math.min(Math.max(limit, 1), 50);
  const rows = await prisma.communityFollow.findMany({
    where: { targetType: "user", targetUserId: userId },
    orderBy: { createdAt: "desc" },
    take,
  });
  const ids = rows.map((r) => r.followerUserId);
  const profiles = await prisma.communityUserProfile.findMany({
    where: { userId: { in: ids } },
  });
  const map = new Map(profiles.map((p) => [p.userId, p]));
  return ids.map((id) => map.get(id)).filter(Boolean).map((p) => mapFollowProfile(p!));
}

export async function listFollowing(userId: string, limit = 30) {
  await getOrCreateUserProfile(userId);
  const take = Math.min(Math.max(limit, 1), 50);
  const rows = await prisma.communityFollow.findMany({
    where: { followerUserId: userId, targetType: "user", targetUserId: { not: null } },
    orderBy: { createdAt: "desc" },
    take,
  });
  const ids = rows.map((r) => r.targetUserId!).filter(Boolean);
  const profiles = await prisma.communityUserProfile.findMany({
    where: { userId: { in: ids } },
  });
  const map = new Map(profiles.map((p) => [p.userId, p]));
  return ids.map((id) => map.get(id)).filter(Boolean).map((p) => mapFollowProfile(p!));
}

export async function isFollowingUser(followerUserId: string, targetUserId: string) {
  const row = await prisma.communityFollow.findFirst({
    where: { followerUserId, targetType: "user", targetUserId },
    select: { id: true },
  });
  return !!row;
}
