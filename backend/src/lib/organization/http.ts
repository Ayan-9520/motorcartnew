import { NextRequest } from "next/server";
import { featureFlags } from "@/config/feature-flags";
import { err, unauthorized } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { OrganizationError } from "@/lib/organization/organization.store";
import { getOrganizationService } from "@/lib/organization";
import type { Actor } from "@/lib/organization/organization.service";

export function organizationLayerOff() {
  if (!featureFlags.organizationLayer) return err("Not found", 404);
  return null;
}

export function actorFrom(req: NextRequest): Actor {
  const auth = getAuthUser(req);
  if (!auth) throw new OrganizationError("Unauthorized", 401, "UNAUTHORIZED");
  return { userId: auth.sub, role: auth.role };
}

export function orgService() {
  return getOrganizationService();
}

export function handleOrganizationError(error: unknown) {
  if (error instanceof OrganizationError) {
    if (error.status === 401) return unauthorized(error.message);
    return err(error.message, error.status);
  }
  return err("Organization request failed", 500);
}
