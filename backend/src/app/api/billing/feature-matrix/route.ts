import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertCommercialOn, commercialActorFrom, handleCommercialError } from "@/lib/commercial/http";
import { commercialEntitlements } from "@/services/commercial-billing.service";

export async function GET(req: NextRequest) {
  try {
    assertCommercialOn();
    const actor = commercialActorFrom(req);
    const organizationId = req.nextUrl.searchParams.get("organizationId") ?? undefined;
    const data = await commercialEntitlements(actor, organizationId);
    return ok({ data });
  } catch (e) {
    return handleCommercialError(e);
  }
}
