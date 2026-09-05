import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handlePartnerOsError } from "@/lib/partneros/http";
import { pincodeFromSearchParams } from "@/lib/inventory/pin";
import { searchParts } from "@/services/partner-industry.service";

export async function GET(req: NextRequest) {
  try {
    const pincode = pincodeFromSearchParams(req.nextUrl.searchParams);
    const data = await searchParts({ pincode });
    return ok({ data, pincode });
  } catch (e) {
    return handlePartnerOsError(e);
  }
}
