import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { requireCommunityPublic } from "@/lib/community/guard";
import { mapUserProfile } from "@/lib/community/map-profile";
import { getPublicProfileForViewer } from "@/services/community-profile.service";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ userId: string }> }
) {
  const gate = requireCommunityPublic("profiles");
  if ("response" in gate) return gate.response;

  const { userId } = await ctx.params;
  const auth = getAuthUser(req);
  const result = await getPublicProfileForViewer(userId, auth?.sub ?? null);
  if (!result) return err("Profile not found", 404);

  return ok({
    data: mapUserProfile(result.profile, {
      is_following: result.is_following,
      is_self: result.is_self,
    }),
  });
}
