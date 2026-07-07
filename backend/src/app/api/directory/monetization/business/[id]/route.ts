import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { unauthorized, forbidden } from "@/lib/api-response";
import { directoryMonetizationOffResponse } from "@/lib/directory/guard";
import { setBusinessMonetization } from "@/services/directory-monetization.service";
import type { BusinessMonetizationMeta } from "@/lib/directory/monetization-meta";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const off = directoryMonetizationOffResponse();
  if (off) return off;

  try {
    requirePlatformAdmin(req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return unauthorized();
    if (msg === "FORBIDDEN") return forbidden();
    return err("Forbidden", 403);
  }

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Partial<BusinessMonetizationMeta> = {};
  if (body.featured !== undefined) patch.featured = Boolean(body.featured);
  if (body.featured_category != null) patch.featured_category = String(body.featured_category);
  if (body.sponsored !== undefined) patch.sponsored = Boolean(body.sponsored);
  if (body.sponsored_tier != null) patch.sponsored_tier = String(body.sponsored_tier);
  if (body.premium_listing !== undefined) patch.premium_listing = Boolean(body.premium_listing);
  if (body.premium_tier != null) patch.premium_tier = String(body.premium_tier);
  if (body.verification_badge !== undefined) {
    patch.verification_badge = body.verification_badge ? String(body.verification_badge) : null;
  }

  const row = await setBusinessMonetization(id, patch);
  if (!row) return err("Not found", 404);
  return ok({ data: row });
}
