import type { NextRequest } from "next/server";
import { err, forbidden, unauthorized } from "@/lib/api-response";
import { salesActorFrom, isAdminRole, isDealerRole, type SalesActor } from "@/lib/sales-os/http";
import { CommercialError } from "./errors";
import { isCommercialEnabled } from "./flags";

export type CommercialActor = SalesActor;
export { salesActorFrom, isAdminRole, isDealerRole };

export function commercialActorFrom(req: NextRequest): CommercialActor {
  return salesActorFrom(req);
}

export function assertCommercialOn() {
  if (!isCommercialEnabled()) throw new CommercialError("Commercial engine is disabled", 403, "FEATURE_DISABLED");
}

export function assertAdmin(actor: CommercialActor) {
  if (!isAdminRole(actor.role)) throw new CommercialError("Forbidden", 403, "FORBIDDEN");
}

export function handleCommercialError(error: unknown) {
  if (error instanceof CommercialError) {
    if (error.status === 401) return unauthorized(error.message);
    if (error.status === 403) return forbidden(error.message);
    return err(error.message, error.status);
  }
  const msg = error instanceof Error ? error.message : "Commercial request failed";
  if (msg === "UNAUTHORIZED") return unauthorized();
  if (msg === "FORBIDDEN") return forbidden();
  return err(msg, 400);
}
