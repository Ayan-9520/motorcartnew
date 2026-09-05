import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { requireCommunityAuth, requireCommunityPublic } from "@/lib/community/guard";
import { mapSocialPost } from "@/lib/community/map-post";
import { communityRateLimit, handleCommunityError } from "@/lib/community/http";
import {
  deleteSocialPost,
  getSocialPostById,
  updateSocialPost,
} from "@/services/community-post.service";

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

  const { post, likedByMe, savedByMe } = result;
  return ok({
    data: mapSocialPost(post, post.author.communityProfile, post.author, {
      liked_by_me: likedByMe,
      saved_by_me: savedByMe,
    }),
  });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await requireCommunityAuth(req, "posts");
  if ("response" in gate) return gate.response;
  const limited = communityRateLimit(req, gate.auth.sub, "post-patch", 40);
  if (limited) return limited;

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const post = await updateSocialPost(id, gate.auth.sub, gate.auth.role, {
      content: body.content != null ? String(body.content) : undefined,
      media: body.media,
      visibility: body.visibility != null ? String(body.visibility) : undefined,
    });
    return ok({
      data: mapSocialPost(post, post.author.communityProfile, post.author),
    });
  } catch (e) {
    return handleCommunityError(e);
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await requireCommunityAuth(req, "posts");
  if ("response" in gate) return gate.response;
  const { id } = await ctx.params;
  try {
    const result = await deleteSocialPost(id, gate.auth.sub, gate.auth.role);
    return ok({ data: result });
  } catch (e) {
    return handleCommunityError(e);
  }
}
