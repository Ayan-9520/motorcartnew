import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertCommercialOn, commercialActorFrom, handleCommercialError } from "@/lib/commercial/http";
import {
  adjustPayoutEntry,
  createPayoutEntry,
  earningsDashboard,
  setPayoutEntryStatus,
} from "@/services/commercial-payout.service";

export async function GET(req: NextRequest) {
  try {
    assertCommercialOn();
    const actor = commercialActorFrom(req);
    const data = await earningsDashboard(actor, req.nextUrl.searchParams.get("organizationId") ?? undefined);
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
      organizationId?: string;
      sourceType?: string;
      sourceId?: string;
      amount?: number;
      product?: string;
      period?: string;
      financeCommissionId?: string;
      entryId?: string;
      status?: string;
      kind?: string;
      reason?: string;
    };
    if (body.action === "status" && body.entryId && body.status) {
      return ok({ data: await setPayoutEntryStatus(actor, body.entryId, body.status) });
    }
    if (body.action === "adjust" && body.entryId) {
      return ok({
        data: await adjustPayoutEntry(actor, body.entryId, String(body.kind), Number(body.amount), String(body.reason)),
      });
    }
    const data = await createPayoutEntry(actor, {
      organizationId: String(body.organizationId),
      sourceType: String(body.sourceType),
      sourceId: String(body.sourceId),
      amount: Number(body.amount),
      product: body.product,
      period: body.period,
      financeCommissionId: body.financeCommissionId,
    });
    return ok({ data });
  } catch (e) {
    return handleCommercialError(e);
  }
}
