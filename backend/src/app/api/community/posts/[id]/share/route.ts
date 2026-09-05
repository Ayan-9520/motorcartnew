import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { requireCommunityAuth } from "@/lib/community/guard";
import { sharePost } from "@/services/community-engagement.service";
import { communityRateLimit, handleCommunityError } from "@/lib/community/http";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await requireCommunityAuth(req, "posts");
  if ("response" in gate) return gate.response;
  const limited = communityRateLimit(req, gate.auth.sub, "share", 30);
  if (limited) return limited;

  const { id } = await ctx.params;
  try {
    const post = await sharePost(id, gate.auth.sub);
    if (!post) return err("Post not found", 404);
    return ok({ data: { post_id: id, share_count: post.shareCount, channel: "community" } });
  } catch (e) {
    return handleCommunityError(e);
  }
}
