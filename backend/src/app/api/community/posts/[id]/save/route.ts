import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireCommunityAuth } from "@/lib/community/guard";
import { savePost, unsavePost } from "@/services/community-engagement.service";
import { communityRateLimit, handleCommunityError } from "@/lib/community/http";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await requireCommunityAuth(req, "posts");
  if ("response" in gate) return gate.response;
  const limited = communityRateLimit(req, gate.auth.sub, "save", 40);
  if (limited) return limited;

  const { id } = await ctx.params;
  try {
    const result = await savePost(id, gate.auth.sub);
    return ok({ data: result }, 201);
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
    const result = await unsavePost(id, gate.auth.sub);
    return ok({ data: result });
  } catch (e) {
    return handleCommunityError(e);
  }
}
