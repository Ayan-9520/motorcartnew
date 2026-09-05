import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handlePartnerOsError, partnerActorFrom, readJson } from "@/lib/partneros/http";
import { authorizeDealer, listOemNetwork, setAuthorizationStatus } from "@/services/partner-industry.service";

export async function GET(req: NextRequest) {
  try {
    const data = await listOemNetwork(partnerActorFrom(req));
    return ok({ data });
  } catch (e) {
    return handlePartnerOsError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req);
    if (typeof body.id === "string" && typeof body.status === "string") {
      const data = await setAuthorizationStatus(partnerActorFrom(req), body.id, body.status);
      return ok({ data });
    }
    const data = await authorizeDealer(partnerActorFrom(req), {
      dealerOrganizationId: String(body.dealerOrganizationId ?? ""),
      brand: String(body.brand ?? ""),
      dealerId: typeof body.dealerId === "string" ? body.dealerId : undefined,
      status: typeof body.status === "string" ? body.status : undefined,
    });
    return ok({ data }, 201);
  } catch (e) {
    return handlePartnerOsError(e);
  }
}
