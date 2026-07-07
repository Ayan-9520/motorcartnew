import type { NextRequest } from "next/server";
import { featureFlags } from "@/config/feature-flags";
import { getAuthUser } from "@/lib/auth/middleware";
import type { JwtPayload } from "@/lib/auth/jwt";
import { err, unauthorized } from "@/lib/api-response";

export type CommunityApiFlag =
  | "profiles"
  | "businessProfiles"
  | "businessPages"
  | "feed"
  | "groupFeed"
  | "posts"
  | "follow"
  | "groups"
  | "groupModeration";

const FLAG_CHECKS: Record<CommunityApiFlag, () => boolean> = {
  profiles: () => featureFlags.communityV2 && featureFlags.communityProfiles,
  businessProfiles: () =>
    featureFlags.communityV2 && featureFlags.communityBusinessProfiles,
  businessPages: () =>
    featureFlags.communityV2 &&
    featureFlags.communityBusinessProfiles &&
    featureFlags.communityBusinessPages,
  feed: () => featureFlags.communityV2 && featureFlags.communityFeed,
  groupFeed: () =>
    featureFlags.communityV2 && featureFlags.communityGroupFeed,
  posts: () => featureFlags.communityV2 && featureFlags.communityPosts,
  follow: () => featureFlags.communityV2 && featureFlags.communityFollow,
  groups: () => featureFlags.communityV2 && featureFlags.communityGroups,
  groupModeration: () =>
    featureFlags.communityV2 &&
    featureFlags.communityGroups &&
    featureFlags.communityGroupModeration,
};

export function isCommunityFlagOn(flag: CommunityApiFlag): boolean {
  return FLAG_CHECKS[flag]();
}

export function communityFlagOffResponse(flag: CommunityApiFlag): Response | null {
  if (!FLAG_CHECKS[flag]()) return err("Not found", 404);
  return null;
}

export async function requireCommunityAuth(
  req: NextRequest,
  flag: CommunityApiFlag
): Promise<{ auth: JwtPayload } | { response: Response }> {
  const off = communityFlagOffResponse(flag);
  if (off) return { response: off };

  const auth = getAuthUser(req);
  if (!auth) return { response: unauthorized() };

  return { auth };
}

export function requireCommunityPublic(
  flag: CommunityApiFlag
): { ok: true } | { response: Response } {
  const off = communityFlagOffResponse(flag);
  if (off) return { response: off };
  return { ok: true };
}
