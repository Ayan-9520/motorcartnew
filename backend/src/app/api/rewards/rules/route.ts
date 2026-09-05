import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertCommercialOn, commercialActorFrom, handleCommercialError } from "@/lib/commercial/http";
import { listRewardRules, upsertRewardRule } from "@/services/commercial-rewards.service";

export async function GET(req: NextRequest) {
  try {
    assertCommercialOn();
    const actor = commercialActorFrom(req);
    const data = await listRewardRules(actor);
    return ok({ data });
  } catch (e) {
    return handleCommercialError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    assertCommercialOn();
    const actor = commercialActorFrom(req);
    const body = (await req.json()) as Parameters<typeof upsertRewardRule>[1];
    const data = await upsertRewardRule(actor, body);
    return ok({ data });
  } catch (e) {
    return handleCommercialError(e);
  }
}
