import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { requireCommunityAuth } from "@/lib/community/guard";
import { mapBusinessProfile } from "@/lib/community/map-profile";
import { getMyBusinessProfile } from "@/services/community-profile.service";

export async function GET(req: NextRequest) {
  const gate = await requireCommunityAuth(req, "businessProfiles");
  if ("response" in gate) return gate.response;

  const row = await getMyBusinessProfile(gate.auth.sub);
  if (!row) return err("Business profile not found", 404);
  return ok({ data: mapBusinessProfile(row) });
}
