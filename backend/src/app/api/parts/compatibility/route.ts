import { NextRequest } from "next/server";
import { featureFlags } from "@/config/feature-flags";
import { searchCompatibleParts } from "@/services/parts-compatibility.service";
import { err, ok } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  if (!featureFlags.partsCompatibility) return err("FEATURE_DISABLED", 404);

  const sp = req.nextUrl.searchParams;
  const result = await searchCompatibleParts({
    brand: sp.get("brand") ?? undefined,
    model: sp.get("model") ?? undefined,
    year: sp.get("year") ? parseInt(sp.get("year")!, 10) : undefined,
    fuelType: sp.get("fuel_type") ?? sp.get("fuelType") ?? undefined,
    registration: sp.get("registration") ?? sp.get("reg") ?? undefined,
    limit: sp.get("limit") ? parseInt(sp.get("limit")!, 10) : 24,
  });

  return ok(result);
}
