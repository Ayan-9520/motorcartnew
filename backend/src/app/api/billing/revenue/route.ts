import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertCommercialOn, commercialActorFrom, handleCommercialError } from "@/lib/commercial/http";
import { revenueDashboard, upsertSetting } from "@/services/commercial-billing.service";

export async function GET(req: NextRequest) {
  try {
    assertCommercialOn();
    const actor = commercialActorFrom(req);
    const data = await revenueDashboard(actor);
    return ok({ data });
  } catch (e) {
    return handleCommercialError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    assertCommercialOn();
    const actor = commercialActorFrom(req);
    const body = (await req.json()) as { key?: string; value?: unknown };
    const data = await upsertSetting(actor, String(body.key), body.value);
    return ok({ data });
  } catch (e) {
    return handleCommercialError(e);
  }
}
