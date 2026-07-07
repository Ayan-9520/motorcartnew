import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { requireCommunityAuth } from "@/lib/community/guard";
import {
  followTarget,
  unfollowTarget,
  type FollowTarget,
} from "@/services/community-engagement.service";

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

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const target = parseTarget(body);
  if (!target) return err("Invalid follow target", 400);

  try {
    const result = await followTarget(gate.auth.sub, target);
    return ok({ data: result }, 201);
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "SELF_FOLLOW") return err("Cannot follow yourself", 400);
      if (e.message === "TARGET_NOT_FOUND") return err("Target not found", 404);
      if (e.message === "MISSING_TARGET") return err("Missing target id", 400);
    }
    return err("Could not follow", 400);
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
    if (e instanceof Error && e.message === "MISSING_TARGET") {
      return err("Missing target id", 400);
    }
    return err("Could not unfollow", 400);
  }
}
