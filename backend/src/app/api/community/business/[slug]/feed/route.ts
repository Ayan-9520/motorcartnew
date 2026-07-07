import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { requireCommunityPublic } from "@/lib/community/guard";
import { mapSocialPost } from "@/lib/community/map-post";
import { getBusinessBySlug } from "@/services/community-profile.service";
import { getCommunityFeed } from "@/services/community-feed.service";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  const gate = requireCommunityPublic("businessPages");
  if ("response" in gate) return gate.response;

  const { slug } = await ctx.params;
  const business = await getBusinessBySlug(slug);
  if (!business) return err("Business not found", 404);

  const { searchParams } = new URL(req.url);
  const auth = getAuthUser(req);

  const result = await getCommunityFeed({
    type: "business",
    business_slug: slug,
    cursor: searchParams.get("cursor"),
    limit: searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!, 10)
      : undefined,
    viewerId: auth?.sub ?? null,
  });

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
