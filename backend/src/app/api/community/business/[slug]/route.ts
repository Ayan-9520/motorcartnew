import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import {
  requireCommunityAuth,
  requireCommunityPublic,
  isCommunityFlagOn,
} from "@/lib/community/guard";
import { mapBusinessProfile } from "@/lib/community/map-profile";
import {
  getBusinessBySlug,
  updateBusinessProfile,
} from "@/services/community-profile.service";
import { getBusinessPageBySlug } from "@/services/community-business-page.service";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const auth = getAuthUser(req);

  if (isCommunityFlagOn("businessPages")) {
    const page = await getBusinessPageBySlug(slug, auth?.sub ?? null);
    if (!page) return err("Business not found", 404);
    return ok({ data: page });
  }

  const gate = requireCommunityPublic("businessProfiles");
  if ("response" in gate) return gate.response;

  const row = await getBusinessBySlug(slug);
  if (!row) return err("Business not found", 404);
  return ok({ data: mapBusinessProfile(row) });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  const gate = await requireCommunityAuth(req, "businessProfiles");
  if ("response" in gate) return gate.response;

  const { slug } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const updated = await updateBusinessProfile(gate.auth.sub, slug, {
    name: body.name != null ? String(body.name) : undefined,
    tagline: body.tagline !== undefined ? (body.tagline == null ? null : String(body.tagline)) : undefined,
    description:
      body.description !== undefined
        ? body.description == null
          ? null
          : String(body.description)
        : undefined,
    logo_url:
      body.logo_url !== undefined
        ? body.logo_url == null
          ? null
          : String(body.logo_url)
        : undefined,
    cover_url:
      body.cover_url !== undefined
        ? body.cover_url == null
          ? null
          : String(body.cover_url)
        : undefined,
    website:
      body.website !== undefined
        ? body.website == null
          ? null
          : String(body.website)
        : undefined,
    phone:
      body.phone !== undefined ? (body.phone == null ? null : String(body.phone)) : undefined,
    city: body.city !== undefined ? (body.city == null ? null : String(body.city)) : undefined,
    state:
      body.state !== undefined ? (body.state == null ? null : String(body.state)) : undefined,
    social_links: body.social_links,
  });

  if (!updated) return err("Business not found", 404);
  return ok({ data: mapBusinessProfile(updated) });
}
