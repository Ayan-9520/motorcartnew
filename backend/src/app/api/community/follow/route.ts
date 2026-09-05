import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { requireCommunityAuth } from "@/lib/community/guard";
import { followTarget, unfollowTarget, type FollowTarget } from "@/services/community-engagement.service";
import { communityRateLimit, handleCommunityError } from "@/lib/community/http";

function parseTarget(body: Record<string, unknown>): FollowTarget | null {
  const targetType = body.target_type != null ? String(body.target_type) : "";
  if (targetType !== "user" && targetType !== "business") return null;
  return {
    target_type: targetType,
    target_user_id:
      body.target_user_id != null ? String(body.target_user_id) : undefined,
    target_business_id:
      body.target_business_id != null ? String(body.target_business_id) : undefined,
  };
}

export async function POST(req: NextRequest) {
  const gate = await requireCommunityAuth(req, "follow");
  if ("response" in gate) return gate.response;

  const limited = communityRateLimit(req, gate.auth.sub, "follow", 40);
  if (limited) return limited;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const target = parseTarget(body);
  if (!target) return err("Invalid follow target", 400);

  try {
    const result = await followTarget(gate.auth.sub, target);
    return ok({ data: result }, 201);
  } catch (e) {
    return handleCommunityError(e);
  }
}

export async function DELETE(req: NextRequest) {
  const gate = await requireCommunityAuth(req, "follow");
  if ("response" in gate) return gate.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const target = parseTarget(body);
  if (!target) return err("Invalid follow target", 400);

  try {
    const result = await unfollowTarget(gate.auth.sub, target);
    return ok({ data: result });
  } catch (e) {
    return handleCommunityError(e);
  }
}
