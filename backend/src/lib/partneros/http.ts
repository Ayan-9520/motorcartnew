import type { NextRequest } from "next/server";
import { err, forbidden, unauthorized } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { InventoryError } from "@/lib/inventory/errors";
import { PartnerOsError } from "./errors";
import { ADMIN_ROLES } from "@/lib/sales-os/http";

export type PartnerActor = { userId: string; role: string };

export function partnerActorFrom(req: NextRequest): PartnerActor {
  const auth = getAuthUser(req);
  if (!auth) throw new PartnerOsError("Unauthorized", 401, "UNAUTHORIZED");
  return { userId: auth.sub, role: auth.role };
}

export function isPlatformAdmin(role: string) {
  return ADMIN_ROLES.has(role);
}

export function handlePartnerOsError(error: unknown) {
  if (error instanceof PartnerOsError) {
    if (error.status === 401) return unauthorized(error.message);
    if (error.status === 403) return forbidden(error.message);
    return err(error.message, error.status);
  }
  if (error instanceof InventoryError) {
    return err(error.message, error.status);
  }
  const msg = error instanceof Error ? error.message : "Request failed";
  return err(msg, 400);
}

export async function readJson(req: NextRequest): Promise<Record<string, unknown>> {
  return (await req.json()) as Record<string, unknown>;
}
