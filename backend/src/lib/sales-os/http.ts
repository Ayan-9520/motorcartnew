import type { NextRequest } from "next/server";
import { err, forbidden, unauthorized } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { SalesOsError } from "./errors";
import { isAiCallingEnabled, isDialerEnabled, isSalesOsEnabled } from "./flags";

export type SalesActor = { userId: string; role: string };

export const DEALER_ROLES = new Set([
  "dealer",
  "used_car_dealer",
  "preowned_dealer",
  "new_car_dealer",
  "bike_dealer",
  "truck_dealer",
]);

export const ADMIN_ROLES = new Set(["admin", "super_admin"]);

export function salesActorFrom(req: NextRequest): SalesActor {
  const auth = getAuthUser(req);
  if (!auth) throw new SalesOsError("Unauthorized", 401, "UNAUTHORIZED");
  return { userId: auth.sub, role: auth.role };
}

export function isDealerRole(role: string): boolean {
  return DEALER_ROLES.has(role);
}

export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.has(role);
}

export function assertSalesOsOn() {
  if (!isSalesOsEnabled()) throw new SalesOsError("Sales OS is disabled", 403, "FEATURE_DISABLED");
}

export function assertDialerLocked() {
  if (isDialerEnabled()) return;
  throw new SalesOsError("Dialer is not available", 403, "DIALER_LOCKED");
}

export function assertAiCallingLocked() {
  if (isAiCallingEnabled()) return;
  throw new SalesOsError("AI calling is not available", 403, "AI_CALLING_LOCKED");
}

export function handleSalesOsError(error: unknown) {
  if (error instanceof SalesOsError) {
    if (error.status === 401) return unauthorized(error.message);
    if (error.status === 403) return forbidden(error.message);
    return err(error.message, error.status);
  }
  const msg = error instanceof Error ? error.message : "Sales OS request failed";
  if (msg === "UNAUTHORIZED") return unauthorized();
  if (msg === "FORBIDDEN") return forbidden();
  return err(msg, 400);
}
