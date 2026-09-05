import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireCommunityAuth } from "@/lib/community/guard";
import { followUserById, unfollowUserById } from "@/services/community-engagement.service";
import { communityRateLimit, handleCommunityError } from "@/lib/community/http";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ userId: string }> }
) {
  const gate = await requireCommunityAuth(req, "follow");
  if ("response" in gate) return gate.response;
  const limited = communityRateLimit(req, gate.auth.sub, "follow", 40);
  if (limited) return limited;

  const { userId } = await ctx.params;
  try {
    const result = await followUserById(gate.auth.sub, userId);
    return ok({ data: result }, 201);
  } catch (e) {
    return handleCommunityError(e);
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ userId: string }> }
) {
  const gate = await requireCommunityAuth(req, "follow");
  if ("response" in gate) return gate.response;
  const { userId } = await ctx.params;
  try {
    const result = await unfollowUserById(gate.auth.sub, userId);
    return ok({ data: result });
  } catch (e) {
    return handleCommunityError(e);
  }
}
