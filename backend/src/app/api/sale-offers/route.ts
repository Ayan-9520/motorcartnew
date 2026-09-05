import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handleSuperAppError, superActorFrom } from "@/lib/superapp/http";
import { acceptOffer, submitPurchaseOffer, withdrawOffer } from "@/services/sale-request.service";

export async function POST(req: NextRequest) {
  try {
    const actor = superActorFrom(req);
    const body = (await req.json()) as {
      action?: string;
      id?: string;
      saleRequestId?: string;
      amount?: number;
      validUntil?: string;
      notes?: string;
      dealerId?: string;
    };
    if (body.action === "accept" && body.id) return ok({ data: await acceptOffer(actor, body.id) });
    if (body.action === "withdraw" && body.id) return ok({ data: await withdrawOffer(actor, body.id) });
    return ok({
      data: await submitPurchaseOffer(actor, {
        saleRequestId: String(body.saleRequestId),
        amount: Number(body.amount),
        validUntil: body.validUntil,
        notes: body.notes,
        dealerId: body.dealerId,
      }),
    });
  } catch (e) {
    return handleSuperAppError(e);
  }
}
