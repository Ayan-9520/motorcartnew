import { NextRequest } from "next/server";
import { featureFlags } from "@/config/feature-flags";
import { fetchVehicleWithDealerBySlug } from "@/services/vehicle-unified.service";
import { err, ok } from "@/lib/api-response";

/** Unified vehicle + dealer + specs by slug (replaces broken join on generic db query). */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  if (!featureFlags.unifiedVehicleApi) {
    return err("FEATURE_DISABLED", 404);
  }

  const { slug } = await ctx.params;
  if (!slug?.trim()) return err("INVALID_SLUG", 400);

  const result = await fetchVehicleWithDealerBySlug(slug.trim());
  if (!result) return err("NOT_FOUND", 404);

  return ok(result);
}
