import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertCommercialOn, commercialActorFrom, handleCommercialError, isAdminRole } from "@/lib/commercial/http";
import { listManagedPlans, upsertManagedPlan } from "@/services/commercial-billing.service";
import { CommercialError } from "@/lib/commercial/errors";

export async function GET() {
  try {
    assertCommercialOn();
    const data = await listManagedPlans();
    return ok({ data });
  } catch (e) {
    return handleCommercialError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    assertCommercialOn();
    const actor = commercialActorFrom(req);
    if (!isAdminRole(actor.role)) throw new CommercialError("Forbidden", 403, "FORBIDDEN");
    const body = (await req.json()) as Parameters<typeof upsertManagedPlan>[1];
    const data = await upsertManagedPlan(actor, body);
    return ok({ data });
  } catch (e) {
    return handleCommercialError(e);
  }
}
