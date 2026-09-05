import type { NextRequest } from "next/server";
import { err, forbidden, unauthorized } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { QuotationError } from "./errors";

export type QuotationActor = { userId: string; role: string };

export const DEALER_QUOTATION_ROLES = new Set([
  "dealer",
  "used_car_dealer",
  "preowned_dealer",
  "new_car_dealer",
  "bike_dealer",
  "truck_dealer",
]);

export const ADMIN_ROLES = new Set(["admin", "super_admin"]);

export function quotationActorFrom(req: NextRequest): QuotationActor {
  const auth = getAuthUser(req);
  if (!auth) throw new QuotationError("Unauthorized", 401, "UNAUTHORIZED");
  return { userId: auth.sub, role: auth.role };
}

export function isDealerQuotationRole(role: string): boolean {
  return DEALER_QUOTATION_ROLES.has(role);
}

export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.has(role);
}

export function requestIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function handleQuotationError(error: unknown) {
  if (error instanceof QuotationError) {
    if (error.status === 401) return unauthorized(error.message);
    if (error.status === 403) return forbidden(error.message);
    return err(error.message, error.status);
  }
  const msg = error instanceof Error ? error.message : "Quotation request failed";
  if (msg === "UNAUTHORIZED") return unauthorized();
  if (msg === "FORBIDDEN") return forbidden();
  return err(msg, 400);
}
