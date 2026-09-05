import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertCommercialOn, commercialActorFrom, handleCommercialError } from "@/lib/commercial/http";

/**
 * Base index route for rewards.
 * Sub-routes exist under:
 * - /api/rewards/account
 * - /api/rewards/ledger
 * - /api/rewards/rules
 * - /api/rewards/statement
 *
 * This index exists so anonymous calls do not hit 404 during launch readiness checks.
 */
export async function GET(req: NextRequest) {
  try {
    assertCommercialOn();
    const actor = commercialActorFrom(req);
    return ok({ data: { available: true, role: actor.role } });
  } catch (e) {
    return handleCommercialError(e);
  }
}

