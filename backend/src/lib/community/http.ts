import type { NextRequest } from "next/server";
import { err, forbidden, unauthorized } from "@/lib/api-response";
import { allowSlidingWindow } from "@/lib/http/sliding-window";
import { CommunityError } from "./errors";

export const COMMUNITY_ADMIN_ROLES = new Set(["admin", "super_admin"]);

export function isCommunityAdminRole(role: string | undefined): boolean {
  return !!role && COMMUNITY_ADMIN_ROLES.has(role);
}

export function requestIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function communityRateLimit(
  req: NextRequest,
  userId: string,
  action: string,
  max: number,
  windowMs = 15 * 60 * 1000,
): Response | null {
  const ip = requestIp(req);
  if (!allowSlidingWindow(`community:${action}:${userId}:${ip}`, max, windowMs)) {
    return err("Too many requests", 429);
  }
  return null;
}

export function handleCommunityError(error: unknown) {
  if (error instanceof CommunityError) {
    if (error.status === 401) return unauthorized(error.message);
    if (error.status === 403) return forbidden(error.message);
    return err(error.message, error.status);
  }
  const msg = error instanceof Error ? error.message : "Community request failed";
  if (msg === "UNAUTHORIZED") return unauthorized();
  if (msg === "FORBIDDEN") return forbidden();
  if (msg === "SELF_FOLLOW") return err("Cannot follow yourself", 400);
  if (msg === "DUPLICATE_FOLLOW") return err("Already following", 409);
  if (msg === "DUPLICATE_LIKE") return err("Already liked", 409);
  if (msg === "DUPLICATE_SHARE") return err("Already shared", 409);
  if (msg === "DUPLICATE_SAVE") return err("Already saved", 409);
  if (msg === "EMPTY_POST") return err("Post content or media required", 400);
  if (msg === "EMPTY_COMMENT") return err("Comment content required", 400);
  if (msg === "TARGET_NOT_FOUND") return err("Target not found", 404);
  if (msg === "USER_NOT_FOUND") return err("User not found", 404);
  return err(msg, 400);
}
