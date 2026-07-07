import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { requireCommunityAuth } from "@/lib/community/guard";
import { mapBusinessProfile } from "@/lib/community/map-profile";
import { createBusinessProfile } from "@/services/community-profile.service";
import type { CommunityBusinessEntityType } from "@prisma/client";

export async function POST(req: NextRequest) {
  const gate = await requireCommunityAuth(req, "businessProfiles");
  if ("response" in gate) return gate.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = body.name != null ? String(body.name).trim() : "";
  if (!name) return err("name is required", 400);

  const entityType = body.entity_type != null ? String(body.entity_type) : undefined;

  try {
    const created = await createBusinessProfile(gate.auth.sub, {
      name,
      entity_type: entityType as CommunityBusinessEntityType | undefined,
      entity_id: body.entity_id != null ? String(body.entity_id) : null,
      tagline: body.tagline != null ? String(body.tagline) : body.description != null ? String(body.description) : null,
      logo_url: body.logo_url != null ? String(body.logo_url) : null,
      cover_url: body.cover_url != null ? String(body.cover_url) : null,
      website: body.website != null ? String(body.website) : null,
      phone: body.phone != null ? String(body.phone) : null,
      city: body.city != null ? String(body.city) : null,
      state: body.state != null ? String(body.state) : null,
      social_links: body.social_links,
    });
    return ok({ data: mapBusinessProfile(created) }, 201);
  } catch {
    return err("Could not create business profile", 400);
  }
}
