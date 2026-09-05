import type { NextRequest } from "next/server";
import { err, forbidden, unauthorized } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { SuperAppError } from "./errors";
import { SalesOsError } from "@/lib/sales-os/errors";
import { isAdminRole, isDealerRole, type SalesActor } from "@/lib/sales-os/http";

export type SuperActor = SalesActor;

export function superActorFrom(req: NextRequest): SuperActor {
  const auth = getAuthUser(req);
  if (!auth) throw new SuperAppError("Unauthorized", 401, "UNAUTHORIZED");
  return { userId: auth.sub, role: auth.role };
}

export function assertCustomer(actor: SuperActor) {
  if (actor.role !== "customer" && !isAdminRole(actor.role)) {
    throw new SuperAppError("Forbidden", 403, "FORBIDDEN");
  }
}

export { isAdminRole, isDealerRole };

export function handleSuperAppError(error: unknown) {
  if (error instanceof SuperAppError || error instanceof SalesOsError) {
    if (error.status === 401) return unauthorized(error.message);
    if (error.status === 403) return forbidden(error.message);
    return err(error.message, error.status);
  }
  const msg = error instanceof Error ? error.message : "Request failed";
  if (msg === "UNAUTHORIZED") return unauthorized();
  if (msg === "FORBIDDEN") return forbidden();
  return err(msg, 400);
}
