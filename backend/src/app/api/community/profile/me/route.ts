import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { requireCommunityAuth } from "@/lib/community/guard";
import { mapUserProfile } from "@/lib/community/map-profile";
import {
  getOrCreateUserProfile,
  updateUserProfile,
} from "@/services/community-profile.service";

export async function GET(req: NextRequest) {
  const gate = await requireCommunityAuth(req, "profiles");
  if ("response" in gate) return gate.response;

  const profile = await getOrCreateUserProfile(gate.auth.sub);
  return ok({ data: mapUserProfile(profile) });
}

export async function PATCH(req: NextRequest) {
  const gate = await requireCommunityAuth(req, "profiles");
  if ("response" in gate) return gate.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const updated = await updateUserProfile(gate.auth.sub, {
      display_name:
        body.display_name != null ? String(body.display_name) : undefined,
      bio: body.bio !== undefined ? (body.bio == null ? null : String(body.bio)) : undefined,
      cover_url:
        body.cover_url !== undefined
          ? body.cover_url == null
            ? null
            : String(body.cover_url)
          : undefined,
      avatar_url:
        body.avatar_url !== undefined
          ? body.avatar_url == null
            ? null
            : String(body.avatar_url)
          : undefined,
      location_city:
        body.location_city !== undefined
          ? body.location_city == null
            ? null
            : String(body.location_city)
          : undefined,
      is_private:
        body.is_private !== undefined ? Boolean(body.is_private) : undefined,
    });
    return ok({ data: mapUserProfile(updated) });
  } catch {
    return err("Could not update profile", 400);
  }
}
