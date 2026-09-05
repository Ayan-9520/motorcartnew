import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireCommunityAuth } from "@/lib/community/guard";
import { mapSocialPost } from "@/lib/community/map-post";
import { listSavedPosts } from "@/services/community-engagement.service";
import { handleCommunityError } from "@/lib/community/http";

export async function GET(req: NextRequest) {
  const gate = await requireCommunityAuth(req, "posts");
  if ("response" in gate) return gate.response;

  const sp = new URL(req.url).searchParams;
  const cursor = sp.get("cursor");
  const limit = sp.get("limit") ? parseInt(sp.get("limit")!, 10) : undefined;

  try {
    const result = await listSavedPosts(gate.auth.sub, limit, cursor);
    return ok({
      data: result.items.map(({ post, saved_by_me }) =>
        mapSocialPost(post, post.author.communityProfile, post.author, {
          saved_by_me,
        }),
      ),
      next_cursor: result.next_cursor,
    });
  } catch (e) {
    return handleCommunityError(e);
  }
}
