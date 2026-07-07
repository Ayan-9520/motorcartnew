import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { requireCommunityPublic } from "@/lib/community/guard";
import { mapSocialPost } from "@/lib/community/map-post";
import { getSocialPostById } from "@/services/community-post.service";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = requireCommunityPublic("posts");
  if ("response" in gate) return gate.response;

  const { id } = await ctx.params;
  const auth = getAuthUser(req);
  const result = await getSocialPostById(id, auth?.sub ?? null);
  if (!result) return err("Post not found", 404);

  const { post, likedByMe } = result;
  return ok({
    data: mapSocialPost(
      post,
      post.author.communityProfile,
      post.author,
      likedByMe !== undefined ? { liked_by_me: likedByMe } : undefined
    ),
  });
}
