import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handlePartnerOsError, partnerActorFrom, readJson } from "@/lib/partneros/http";
import { partnersByPin, upsertCoverage } from "@/services/partner-industry.service";

export async function GET(req: NextRequest) {
  try {
    const domain = req.nextUrl.searchParams.get("domain") ?? "VEHICLE";
    const pincode = req.nextUrl.searchParams.get("pincode") ?? "";
    const data = await partnersByPin(domain, pincode);
    return ok({ data });
  } catch (e) {
    return handlePartnerOsError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req);
    const data = await upsertCoverage(partnerActorFrom(req), String(body.domain ?? ""), String(body.pincode ?? body.postalCode ?? ""));
    return ok({ data }, 201);
  } catch (e) {
    return handlePartnerOsError(e);
  }
}
