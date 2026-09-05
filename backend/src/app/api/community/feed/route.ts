import { NextRequest } from "next/server";
import { ok, forbidden } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { requireCommunityPublic } from "@/lib/community/guard";
import { mapSocialPost } from "@/lib/community/map-post";
import { getCommunityFeed, type FeedType } from "@/services/community-feed.service";

const FEED_TYPES = new Set<FeedType>([
  "global",
  "following",
  "user",
  "business",
  "group",
]);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawType = (searchParams.get("type") ?? "global").toLowerCase();
  const isGroupFeed = rawType === "group";

  const gate = requireCommunityPublic(isGroupFeed ? "groupFeed" : "feed");
  if ("response" in gate) return gate.response;

  const type = FEED_TYPES.has(rawType as FeedType) ? (rawType as FeedType) : "global";
  const cursor = searchParams.get("cursor");
  const handle = searchParams.get("handle");
  const businessSlug = searchParams.get("business_slug");
  const groupSlug = searchParams.get("group_slug");
  const dealerId = searchParams.get("dealer_id");
  const authorId = searchParams.get("author_id");
  const vehicleOnly = searchParams.get("vehicle_only") === "1" || searchParams.get("vehicle_only") === "true";
  const limit = searchParams.get("limit")
    ? parseInt(searchParams.get("limit")!, 10)
    : undefined;

  const auth = getAuthUser(req);
  const viewerId = auth?.sub ?? null;

  const result = await getCommunityFeed({
    type,
    cursor,
    limit: Number.isFinite(limit) ? limit : undefined,
    viewerId,
    handle,
    business_slug: businessSlug,
    group_slug: groupSlug,
    dealer_id: dealerId,
    author_id: authorId,
    vehicle_only: vehicleOnly,
  });

  if (result.forbidden) {
    return forbidden("Group feed is private");
  }

  return ok({
    data: result.items.map(({ post, liked_by_me, saved_by_me }) =>
      mapSocialPost(
        post,
        post.author.communityProfile,
        post.author,
        {
          ...(liked_by_me !== undefined ? { liked_by_me } : {}),
          ...(saved_by_me !== undefined ? { saved_by_me } : {}),
        }
      )
    ),
    next_cursor: result.next_cursor,
  });
}
