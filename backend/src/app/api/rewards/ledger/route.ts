import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertCommercialOn, commercialActorFrom, handleCommercialError } from "@/lib/commercial/http";
import { applyReward, getRewardAccount } from "@/services/commercial-rewards.service";

export async function GET(req: NextRequest) {
  try {
    assertCommercialOn();
    const actor = commercialActorFrom(req);
    const data = await getRewardAccount(actor, req.nextUrl.searchParams.get("userId") ?? undefined);
    return ok({ data: data.ledger });
  } catch (e) {
    return handleCommercialError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    assertCommercialOn();
    const actor = commercialActorFrom(req);
    const body = (await req.json()) as Parameters<typeof applyReward>[1];
    const data = await applyReward(actor, body);
    return ok({ data });
  } catch (e) {
    return handleCommercialError(e);
  }
}
