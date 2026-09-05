import type { NextRequest } from "next/server";
import { err, forbidden, unauthorized } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { CommosError } from "./errors";
import { isAdminRole, isDealerRole, type SalesActor } from "@/lib/sales-os/http";
import { SalesOsError } from "@/lib/sales-os/errors";

export type CommActor = SalesActor;

export function commActorFrom(req: NextRequest): CommActor {
  const auth = getAuthUser(req);
  if (!auth) throw new CommosError("Unauthorized", 401, "UNAUTHORIZED");
  return { userId: auth.sub, role: auth.role };
}

export { isAdminRole, isDealerRole };

export function handleCommosError(error: unknown) {
  if (error instanceof CommosError || error instanceof SalesOsError) {
    if (error.status === 401) return unauthorized(error.message);
    if (error.status === 403) return forbidden(error.message);
    return err(error.message, error.status);
  }
  const msg = error instanceof Error ? error.message : "Request failed";
  return err(msg, 400);
}
