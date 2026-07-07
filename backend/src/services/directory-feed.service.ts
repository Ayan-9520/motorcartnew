import { prisma } from "@/lib/prisma";

export async function getDirectoryBusinessFeed(ownerUserId: string, limit = 20) {
  const posts = await prisma.socialPost.findMany({
    where: {
      authorId: ownerUserId,
      deletedAt: null,
      moderationStatus: "approved",
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 50),
    include: {
      author: { include: { communityProfile: true } },
    },
  });

  return posts.map((p) => ({
    id: p.id,
    content: p.content,
    media: p.media,
    post_kind: p.postKind,
    like_count: p.likeCount,
    comment_count: p.commentCount,
    created_at: p.createdAt.toISOString(),
    author: {
      id: p.author.id,
      display_name: p.author.communityProfile?.displayName ?? p.author.email,
      handle: p.author.communityProfile?.handle ?? null,
    },
  }));
}
