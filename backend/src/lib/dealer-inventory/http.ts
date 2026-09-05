import type { NextRequest } from "next/server";
import { err, forbidden, unauthorized } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { isAdminRole, isDealerRole, type SalesActor } from "@/lib/sales-os/http";
import { SalesOsError } from "@/lib/sales-os/errors";
import { DealerInventoryError } from "./errors";

export function inventoryActorFrom(req: NextRequest): SalesActor {
  const auth = getAuthUser(req);
  if (!auth) throw new DealerInventoryError("Unauthorized", 401, "UNAUTHORIZED");
  return { userId: auth.sub, role: auth.role };
}

export function requireDealerInventoryRole(actor: SalesActor) {
  if (isAdminRole(actor.role) || isDealerRole(actor.role)) return;
  throw new DealerInventoryError("Forbidden", 403, "FORBIDDEN");
}

export function handleDealerInventoryError(error: unknown) {
  if (error instanceof DealerInventoryError) {
    if (error.status === 401) return unauthorized(error.message);
    if (error.status === 403) return forbidden(error.message);
    return err(error.message, error.status);
  }
  if (error instanceof SalesOsError) {
    if (error.status === 401) return unauthorized(error.message);
    if (error.status === 403) return forbidden(error.message);
    return err(error.message, error.status);
  }
  const msg = error instanceof Error ? error.message : "Inventory request failed";
  if (msg === "UNAUTHORIZED") return unauthorized();
  if (msg === "FORBIDDEN") return forbidden();
  return err(msg, 400);
}
