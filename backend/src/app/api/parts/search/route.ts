import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handlePartnerOsError } from "@/lib/partneros/http";
import { searchParts } from "@/services/partner-industry.service";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const data = await searchParts({
      q: sp.get("q") ?? undefined,
      partNumber: sp.get("partNumber") ?? undefined,
      brand: sp.get("brand") ?? undefined,
      pincode: sp.get("pincode") ?? undefined,
      vehicleCategory: sp.get("vehicleCategory") ?? undefined,
      make: sp.get("make") ?? undefined,
      model: sp.get("model") ?? undefined,
    });
    return ok({ data, vinCompatibility: false });
  } catch (e) {
    return handlePartnerOsError(e);
  }
}
