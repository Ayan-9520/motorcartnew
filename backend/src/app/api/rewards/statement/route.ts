import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertCommercialOn, commercialActorFrom, handleCommercialError } from "@/lib/commercial/http";
import { monthlyStatement } from "@/services/commercial-rewards.service";

export async function GET(req: NextRequest) {
  try {
    assertCommercialOn();
    const actor = commercialActorFrom(req);
    const year = Number(req.nextUrl.searchParams.get("year") ?? new Date().getFullYear());
    const month = Number(req.nextUrl.searchParams.get("month") ?? new Date().getMonth() + 1);
    const userId = req.nextUrl.searchParams.get("userId") ?? undefined;
    const data = await monthlyStatement(actor, year, month, userId);
    return ok({ data });
  } catch (e) {
    return handleCommercialError(e);
  }
}
