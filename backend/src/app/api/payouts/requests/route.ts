import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertCommercialOn, commercialActorFrom, handleCommercialError } from "@/lib/commercial/http";
import { createPayoutRequest, listPayoutRequests, reviewPayoutRequest } from "@/services/commercial-payout.service";

export async function GET(req: NextRequest) {
  try {
    assertCommercialOn();
    const actor = commercialActorFrom(req);
    const data = await listPayoutRequests(actor, req.nextUrl.searchParams.get("organizationId") ?? undefined);
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
      entryIds?: string[];
      organizationId?: string;
      requestId?: string;
      status?: string;
      note?: string;
      action?: string;
    };
    if (body.action === "review" && body.requestId && body.status) {
      return ok({ data: await reviewPayoutRequest(actor, body.requestId, body.status, body.note) });
    }
    const data = await createPayoutRequest(actor, body.entryIds ?? [], body.organizationId);
    return ok({ data });
  } catch (e) {
    return handleCommercialError(e);
  }
}
