import { prisma } from "@/lib/prisma";
import {
  getProfileByHandle,
  getBusinessBySlug,
} from "@/services/community-profile.service";
import {
  assertCanViewGroupFeed,
  getCommunityGroupBySlug,
} from "@/services/community-group.service";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export type FeedType = "global" | "following" | "user" | "business" | "group";

export async function getCommunityFeed(params: {
  type: FeedType;
  cursor?: string | null;
  limit?: number;
  viewerId?: string | null;
  handle?: string | null;
  business_slug?: string | null;
  group_slug?: string | null;
}) {
  const limit = Math.min(Math.max(params.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const cursorDate = params.cursor ? new Date(params.cursor) : null;

  const baseWhere: Record<string, unknown> = {
    deletedAt: null,
    moderationStatus: "approved",
  };

  if (params.type === "following") {
    if (!params.viewerId) {
      return { items: [], next_cursor: null, forbidden: false as const };
    }

    const follows = await prisma.communityFollow.findMany({
      where: {
        followerUserId: params.viewerId,
        targetType: "user",
        targetUserId: { not: null },
      },
      select: { targetUserId: true },
    });

    const legacy = await prisma.userFollow.findMany({
      where: { followerId: params.viewerId },
      select: { followingId: true },
    });

    const authorIds = [
      ...new Set([
        ...follows.map((f) => f.targetUserId!).filter(Boolean),
        ...legacy.map((f) => f.followingId),
      ]),
    ];

    if (authorIds.length === 0) {
      return { items: [], next_cursor: null, forbidden: false as const };
    }

    Object.assign(baseWhere, { authorId: { in: authorIds } });
  }

  if (params.type === "user") {
    const handle = params.handle?.replace(/^@/, "");
    if (!handle) return { items: [], next_cursor: null, forbidden: false as const };
    const profile = await getProfileByHandle(handle);
    if (!profile) return { items: [], next_cursor: null, forbidden: false as const };
    Object.assign(baseWhere, { authorId: profile.userId });
  }

  if (params.type === "business") {
    const slug = params.business_slug;
    if (!slug) return { items: [], next_cursor: null, forbidden: false as const };
    const business = await getBusinessBySlug(slug);
    if (!business) return { items: [], next_cursor: null, forbidden: false as const };
    Object.assign(baseWhere, { authorId: business.ownerUserId });
  }

  if (params.type === "group") {
    const slug = params.group_slug;
    if (!slug) return { items: [], next_cursor: null, forbidden: false as const };
    const group = await getCommunityGroupBySlug(slug);
    if (!group) return { items: [], next_cursor: null, forbidden: false as const };
    const canView = await assertCanViewGroupFeed(group, params.viewerId ?? null);
    if (!canView) {
      return { items: [], next_cursor: null, forbidden: true as const };
    }
    Object.assign(baseWhere, { groupId: group.id });
  }

  const where = {
    ...baseWhere,
    ...(cursorDate && !Number.isNaN(cursorDate.getTime())
      ? { createdAt: { lt: cursorDate } }
      : {}),
  };

  const posts = await prisma.socialPost.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
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

  let likedSet = new Set<string>();
  if (params.viewerId && posts.length > 0) {
    const likes = await prisma.postLike.findMany({
      where: {
        userId: params.viewerId,
        postId: { in: posts.map((p) => p.id) },
      },
      select: { postId: true },
    });
    likedSet = new Set(likes.map((l) => l.postId));
  }

  const next =
    posts.length === limit
      ? posts[posts.length - 1]?.createdAt.toISOString() ?? null
      : null;

  return {
    items: posts.map((p) => ({
      post: p,
      liked_by_me: params.viewerId ? likedSet.has(p.id) : undefined,
    })),
    next_cursor: next,
    forbidden: false as const,
  };
}
