import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertCommercialOn, commercialActorFrom, handleCommercialError } from "@/lib/commercial/http";
import { adaptFinanceCommission } from "@/services/commercial-payout.service";

export async function POST(req: NextRequest) {
  try {
    assertCommercialOn();
    const actor = commercialActorFrom(req);
    const body = (await req.json()) as { commissionId?: string; organizationId?: string };
    const data = await adaptFinanceCommission(actor, String(body.commissionId), String(body.organizationId));
    return ok({ data });
  } catch (e) {
    return handleCommercialError(e);
  }
}
