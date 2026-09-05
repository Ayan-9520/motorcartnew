import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handlePartnerOsError, partnerActorFrom } from "@/lib/partneros/http";
import { oemMetrics } from "@/services/partner-industry.service";

export async function GET(req: NextRequest) {
  try {
    const data = await oemMetrics(partnerActorFrom(req));
    return ok({ data });
  } catch (e) {
    return handlePartnerOsError(e);
  }
}
