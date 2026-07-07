import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { requireCommunityAuth } from "@/lib/community/guard";
import { likePost, unlikePost } from "@/services/community-engagement.service";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await requireCommunityAuth(req, "posts");
  if ("response" in gate) return gate.response;

  const { id } = await ctx.params;
  const post = await likePost(id, gate.auth.sub);
  if (!post) return err("Post not found", 404);
  return ok({ data: { post_id: id, liked: true, like_count: post.likeCount } });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await requireCommunityAuth(req, "posts");
  if ("response" in gate) return gate.response;

  const { id } = await ctx.params;
  const post = await unlikePost(id, gate.auth.sub);
  if (!post) return err("Post not found", 404);
  return ok({ data: { post_id: id, liked: false, like_count: post.likeCount } });
}
