import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { getVehicleDetail, toLegacyListingPayload } from "@/lib/vehicles/vehicle-detail.service";

/** Vehicle detail by UUID or slug: marketplace → dealer inventory → catalog. */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id?.trim()) return err("INVALID_ID", 400);

  const detail = await getVehicleDetail(id.trim());
  if (!detail) return err("Vehicle not found", 404);

  const legacy = toLegacyListingPayload(detail);
  return ok({
    data: {
      ...legacy.vehicle,
      dealer: legacy.dealer,
      specs: legacy.specs,
      source_type: detail.source_type,
      purchasable: detail.purchasable,
      enquiry_allowed: detail.enquiry_allowed,
      availability: detail.availability,
      media: detail.media,
    },
    detail,
  });
}
