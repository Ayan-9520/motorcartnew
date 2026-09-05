import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertCommercialOn, commercialActorFrom, handleCommercialError } from "@/lib/commercial/http";
import { listReconciliations, reviewReconciliation, upsertReconciliation } from "@/services/commercial-payout.service";

export async function GET(req: NextRequest) {
  try {
    assertCommercialOn();
    const actor = commercialActorFrom(req);
    const data = await listReconciliations(actor);
    return ok({ data });
  } catch (e) {
    return handleCommercialError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    assertCommercialOn();
    const actor = commercialActorFrom(req);
    const body = (await req.json()) as {
      action?: string;
      id?: string;
      source?: string;
      period?: string;
      expectedAmount?: number;
      receivedAmount?: number;
      reference?: string;
    };
    if (body.action === "review" && body.id) {
      return ok({ data: await reviewReconciliation(actor, body.id) });
    }
    const data = await upsertReconciliation(actor, {
      source: String(body.source),
      period: String(body.period),
      expectedAmount: Number(body.expectedAmount),
      receivedAmount: Number(body.receivedAmount),
      reference: body.reference,
    });
    return ok({ data });
  } catch (e) {
    return handleCommercialError(e);
  }
}
