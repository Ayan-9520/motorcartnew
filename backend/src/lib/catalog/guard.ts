import { featureFlags } from "@/config/feature-flags";
import { err } from "@/lib/api-response";

export function isCatalogAdminEnabled(): boolean {
  return featureFlags.catalogAdmin;
}

export function catalogAdminOffResponse(): Response | null {
  if (!isCatalogAdminEnabled()) return err("Not found", 404);
  return null;
}
