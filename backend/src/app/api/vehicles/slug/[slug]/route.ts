import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
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
  let vehicle = legacy.vehicle;

  // Marketplace (used / owner) rows: legacy payload has placeholder kms/owners/description — use the stored row.
  if (detail.source_type === "marketplace") {
    const row = await prisma.vehicle.findFirst({
      where: { id: detail.id, deletedAt: null },
      select: {
        kmsDriven: true,
        owners: true,
        color: true,
        features: true,
        description: true,
        isCertified: true,
        isFeatured: true,
        condition: true,
        category: true,
        saleMode: true,
        metadata: true,
        originalPrice: true,
        createdAt: true,
      },
    });
    if (row) {
      const storedMeta =
        row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : {};
      vehicle = {
        ...vehicle,
        kms_driven: row.kmsDriven,
        owners: row.owners,
        color: row.color,
        features: row.features,
        description: row.description,
        is_certified: row.isCertified,
        is_featured: row.isFeatured,
        condition: row.condition || vehicle.condition,
        category: row.category || vehicle.category,
        sale_mode: row.saleMode ?? vehicle.sale_mode,
        original_price: row.originalPrice != null ? Number(row.originalPrice) : null,
        created_at: row.createdAt,
        metadata: { ...storedMeta, ...(vehicle.metadata as Record<string, unknown>) },
      };
    }
  }

  return ok({
    vehicle,
    dealer: legacy.dealer,
    specs: legacy.specs,
    source_type: detail.source_type,
    purchasable: detail.purchasable,
    enquiry_allowed: detail.enquiry_allowed,
    availability: detail.availability,
    detail,
  });
}
