import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireCommunityAuth } from "@/lib/community/guard";
import { deletePostComment, updatePostComment } from "@/services/community-engagement.service";
import { handleCommunityError } from "@/lib/community/http";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await requireCommunityAuth(req, "posts");
  if ("response" in gate) return gate.response;

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const comment = await updatePostComment(
      id,
      gate.auth.sub,
      gate.auth.role,
      body.content != null ? String(body.content) : "",
    );
    return ok({
      data: {
        id: comment.id,
        post_id: comment.postId,
        user_id: comment.userId,
        content: comment.content,
        updated_at: comment.updatedAt.toISOString(),
      },
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
    const result = await deletePostComment(id, gate.auth.sub, gate.auth.role);
    return ok({ data: result });
  } catch (e) {
    return handleCommunityError(e);
  }
}
