import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { getVehicleDetail, toLegacyListingPayload } from "@/lib/vehicles/vehicle-detail.service";

/** Unified vehicle + dealer by slug or id. Catalog-only records are not purchasable. */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  if (!slug?.trim()) return err("INVALID_SLUG", 400);

  const detail = await getVehicleDetail(slug.trim());
  if (!detail) return err("NOT_FOUND", 404);

  const legacy = toLegacyListingPayload(detail);
  return ok({
    vehicle: legacy.vehicle,
    dealer: legacy.dealer,
    specs: legacy.specs,
    source_type: detail.source_type,
    purchasable: detail.purchasable,
    enquiry_allowed: detail.enquiry_allowed,
    availability: detail.availability,
    detail,
  });
}
