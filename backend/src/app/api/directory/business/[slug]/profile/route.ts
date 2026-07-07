import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { requireDirectoryAuth } from "@/lib/directory/guard";
import { updateDirectoryBusinessMetadata } from "@/services/directory-profile.service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const gate = await requireDirectoryAuth(req);
  if ("response" in gate) return gate.response;

  const { slug } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const updated = await updateDirectoryBusinessMetadata(gate.auth.sub, slug, {
    about: body.about !== undefined ? (body.about ? String(body.about) : null) : undefined,
    services: Array.isArray(body.services) ? body.services : undefined,
    contact:
      body.contact && typeof body.contact === "object"
        ? (body.contact as Record<string, unknown>)
        : undefined,
    website: body.website !== undefined ? (body.website ? String(body.website) : null) : undefined,
    phone: body.phone !== undefined ? (body.phone ? String(body.phone) : null) : undefined,
    social_links: body.social_links ?? body.socialLinks,
  });

  if (!updated) return err("Not found or not owner", 404);
  return ok({ data: updated });
}
