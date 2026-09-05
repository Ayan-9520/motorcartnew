import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handleSuperAppError, superActorFrom } from "@/lib/superapp/http";
import { listValuationQueue, submitValuation } from "@/services/sale-request.service";

export async function GET(req: NextRequest) {
  try {
    const actor = superActorFrom(req);
    return ok({ data: await listValuationQueue(actor) });
  } catch (e) {
    return handleSuperAppError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = superActorFrom(req);
    const body = (await req.json()) as {
      saleRequestId?: string;
      amountMin?: number;
      amountMax?: number;
      condition?: string;
      validUntil?: string;
      notes?: string;
    };
    return ok({
      data: await submitValuation(actor, {
        saleRequestId: String(body.saleRequestId),
        amountMin: Number(body.amountMin),
        amountMax: Number(body.amountMax),
        condition: body.condition,
        validUntil: body.validUntil,
        notes: body.notes,
      }),
    });
  } catch (e) {
    return handleSuperAppError(e);
  }
}
