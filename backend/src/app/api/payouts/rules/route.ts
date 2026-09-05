import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertCommercialOn, commercialActorFrom, handleCommercialError } from "@/lib/commercial/http";
import { evaluatePayoutRule, listPayoutRules, upsertPayoutRule } from "@/services/commercial-payout.service";

export async function GET(req: NextRequest) {
  try {
    assertCommercialOn();
    const actor = commercialActorFrom(req);
    const data = await listPayoutRules(actor);
    return ok({ data });
  } catch (e) {
    return handleCommercialError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    assertCommercialOn();
    const actor = commercialActorFrom(req);
    const body = (await req.json()) as Parameters<typeof upsertPayoutRule>[1] & {
      action?: string;
      ruleId?: string;
      achievement?: number;
      realized?: number;
    };
    if (body.action === "evaluate" && body.ruleId) {
      return ok({ data: await evaluatePayoutRule(body.ruleId, Number(body.achievement), body.realized) });
    }
    const data = await upsertPayoutRule(actor, body);
    return ok({ data });
  } catch (e) {
    return handleCommercialError(e);
  }
}
