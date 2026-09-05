import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { requireCommunityAuth, requireCommunityPublic } from "@/lib/community/guard";
import { addPostComment, listPostComments } from "@/services/community-engagement.service";
import { communityRateLimit, handleCommunityError } from "@/lib/community/http";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = requireCommunityPublic("posts");
  if ("response" in gate) return gate.response;

  const { id } = await ctx.params;
  const limit = new URL(req.url).searchParams.get("limit");
  const comments = await listPostComments(id, limit ? parseInt(limit, 10) : 50);
  if (comments === null) return err("Post not found", 404);
  return ok({ data: comments });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await requireCommunityAuth(req, "posts");
  if ("response" in gate) return gate.response;
  const limited = communityRateLimit(req, gate.auth.sub, "comment", 40);
  if (limited) return limited;

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const content = body.content != null ? String(body.content) : "";

  try {
    const comment = await addPostComment(id, gate.auth.sub, content);
    if (!comment) return err("Post not found", 404);

    return ok(
      {
        data: {
          id: comment.id,
          post_id: comment.postId,
          user_id: comment.userId,
          parent_id: null,
          content: comment.content,
          created_at: comment.createdAt.toISOString(),
          author: comment.user.communityProfile
            ? {
                handle: comment.user.communityProfile.handle,
                display_name: comment.user.communityProfile.displayName,
                avatar_url: comment.user.communityProfile.avatarUrl,
              }
            : {
                handle: null,
                display_name: comment.user.fullName,
                avatar_url: comment.user.avatarUrl,
              },
        },
      },
      201
    );
  } catch (e) {
    return handleCommunityError(e);
  }
}
