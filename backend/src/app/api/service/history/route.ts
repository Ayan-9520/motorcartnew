import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handlePartnerOsError, partnerActorFrom } from "@/lib/partneros/http";
import { serviceHistory } from "@/services/partner-industry.service";

export async function GET(req: NextRequest) {
  try {
    const customerUserId = req.nextUrl.searchParams.get("customerUserId") ?? undefined;
    const data = await serviceHistory(partnerActorFrom(req), customerUserId);
    return ok({ data });
  } catch (e) {
    return handlePartnerOsError(e);
  }
}
