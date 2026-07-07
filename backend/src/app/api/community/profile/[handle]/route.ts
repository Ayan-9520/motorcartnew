import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { requireCommunityPublic } from "@/lib/community/guard";
import { mapUserProfile } from "@/lib/community/map-profile";
import { getProfileByHandle } from "@/services/community-profile.service";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ handle: string }> }
) {
  const gate = requireCommunityPublic("profiles");
  if ("response" in gate) return gate.response;

  const { handle } = await ctx.params;
  const row = await getProfileByHandle(handle);
  if (!row) return err("Profile not found", 404);

  return ok({ data: mapUserProfile(row) });
}
