import { prisma } from "@/lib/prisma";
import { getOrCreateUserProfile } from "@/services/community-profile.service";

export async function likePost(postId: string, userId: string) {
  const post = await prisma.socialPost.findFirst({
    where: { id: postId, deletedAt: null },
  });
  if (!post) return null;

  await prisma.$transaction(async (tx) => {
    const existing = await tx.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (existing) return;

    await tx.postLike.create({ data: { postId, userId } });
    await tx.socialPost.update({
      where: { id: postId },
      data: { likeCount: { increment: 1 } },
    });
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
    parent_id: c.parentId,
    content: c.content,
    created_at: c.createdAt.toISOString(),
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
  parentId?: string | null
) {
  const text = content.trim();
  if (!text) throw new Error("EMPTY_COMMENT");

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
        parentId: parentId ?? null,
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

  return comment;
}

export async function sharePost(postId: string, userId: string) {
  const post = await prisma.socialPost.findFirst({
    where: { id: postId, deletedAt: null },
  });
  if (!post) return null;

  await prisma.$transaction(async (tx) => {
    await tx.postShare.create({ data: { postId, userId } });
    await tx.socialPost.update({
      where: { id: postId },
      data: { shareCount: { increment: 1 } },
    });
  });

  return prisma.socialPost.findUnique({ where: { id: postId } });
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
    if (!targetUserId) throw new Error("MISSING_TARGET");
    if (targetUserId === followerUserId) throw new Error("SELF_FOLLOW");

    const profile = await prisma.communityUserProfile.findUnique({
      where: { userId: targetUserId },
    });
    if (!profile) throw new Error("TARGET_NOT_FOUND");

    await prisma.$transaction(async (tx) => {
      const exists = await tx.communityFollow.findFirst({
        where: {
          followerUserId,
          targetType: "user",
          targetUserId,
        },
      });
      if (exists) return;

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

    return { followed: true, target_type: "user", target_user_id: targetUserId };
  }

  if (target.target_type === "business") {
    const targetBusinessId = target.target_business_id;
    if (!targetBusinessId) throw new Error("MISSING_TARGET");

    const business = await prisma.communityBusinessProfile.findUnique({
      where: { id: targetBusinessId },
    });
    if (!business) throw new Error("TARGET_NOT_FOUND");

    await prisma.$transaction(async (tx) => {
      const exists = await tx.communityFollow.findFirst({
        where: {
          followerUserId,
          targetType: "business",
          targetBusinessId,
        },
      });
      if (exists) return;

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

  throw new Error("INVALID_TARGET");
}

export async function unfollowTarget(followerUserId: string, target: FollowTarget) {
  if (target.target_type === "user") {
    const targetUserId = target.target_user_id;
    if (!targetUserId) throw new Error("MISSING_TARGET");

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

      await tx.communityUserProfile.update({
        where: { userId: targetUserId },
        data: { followerCount: { decrement: 1 } },
      });
      await tx.communityUserProfile.update({
        where: { userId: followerUserId },
        data: { followingCount: { decrement: 1 } },
      });
    });

    return { unfollowed: true, target_type: "user", target_user_id: targetUserId };
  }

  if (target.target_type === "business") {
    const targetBusinessId = target.target_business_id;
    if (!targetBusinessId) throw new Error("MISSING_TARGET");

    await prisma.$transaction(async (tx) => {
      const removed = await tx.communityFollow.deleteMany({
        where: {
          followerUserId,
          targetType: "business",
          targetBusinessId,
        },
      });
      if (removed.count === 0) return;

      await tx.communityBusinessProfile.update({
        where: { id: targetBusinessId },
        data: { followerCount: { decrement: 1 } },
      });
    });

    return {
      unfollowed: true,
      target_type: "business",
      target_business_id: targetBusinessId,
    };
  }

  throw new Error("INVALID_TARGET");
}
