import { featureFlags } from "@/config/feature-flags";
import { err } from "@/lib/api-response";

export function isUnifiedSearchEnabled(): boolean {
  return featureFlags.unifiedSearch;
}

export function unifiedSearchOffResponse(): Response | null {
  if (!isUnifiedSearchEnabled()) return err("Not found", 404);
  return null;
}

export function requireUnifiedSearchPublic(): { ok: true } | { response: Response } {
  const off = unifiedSearchOffResponse();
  if (off) return { response: off };
  return { ok: true };
}
