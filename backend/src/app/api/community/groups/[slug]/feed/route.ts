import { NextRequest } from "next/server";
import { ok, forbidden } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { requireCommunityPublic } from "@/lib/community/guard";
import { mapSocialPost } from "@/lib/community/map-post";
import { getCommunityFeed } from "@/services/community-feed.service";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  const gate = requireCommunityPublic("groupFeed");
  if ("response" in gate) return gate.response;

  const { slug } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const auth = getAuthUser(req);

  const result = await getCommunityFeed({
    type: "group",
    group_slug: slug,
    cursor: searchParams.get("cursor"),
    limit: searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!, 10)
      : undefined,
    viewerId: auth?.sub ?? null,
  });

  if (result.forbidden) {
    return forbidden("Group feed is private");
  }

  return ok({
    data: result.items.map(({ post, liked_by_me }) =>
      mapSocialPost(
        post,
        post.author.communityProfile,
        post.author,
        liked_by_me !== undefined ? { liked_by_me } : undefined
      )
    ),
    next_cursor: result.next_cursor,
  });
}
