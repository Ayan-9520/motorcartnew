import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handlePartnerOsError, partnerActorFrom, readJson } from "@/lib/partneros/http";
import { listClaims, notifyClaim } from "@/services/partner-industry.service";

export async function GET(req: NextRequest) {
  try {
    const data = await listClaims(partnerActorFrom(req));
    return ok({ data });
  } catch (e) {
    return handlePartnerOsError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req);
    const data = await notifyClaim(partnerActorFrom(req), {
      policyId: String(body.policyId ?? ""),
      incidentAt: String(body.incidentAt ?? ""),
      description: String(body.description ?? ""),
    });
    return ok({ data }, 201);
  } catch (e) {
    return handlePartnerOsError(e);
  }
}
