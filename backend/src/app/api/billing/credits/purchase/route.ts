import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertCommercialOn, commercialActorFrom, handleCommercialError } from "@/lib/commercial/http";
import { createLeadCreditPurchase } from "@/services/commercial-billing.service";

export async function POST(req: NextRequest) {
  try {
    assertCommercialOn();
    const actor = commercialActorFrom(req);
    const body = (await req.json()) as { organizationId?: string; credits?: number; amount?: number; status?: string };
    if (body.status) {
      const { rejectClientPaidStatus } = await import("@/services/commercial-billing.service");
      await rejectClientPaidStatus(body.status);
    }
    const data = await createLeadCreditPurchase(actor, {
      organizationId: body.organizationId,
      credits: Number(body.credits),
      amount: Number(body.amount),
    });
    return ok({ data });
  } catch (e) {
    return handleCommercialError(e);
  }
}
