import type { NextRequest } from "next/server";
import { featureFlags } from "@/config/feature-flags";
import { getAuthUser } from "@/lib/auth/middleware";
import type { JwtPayload } from "@/lib/auth/jwt";
import { err, unauthorized } from "@/lib/api-response";

export function isUnifiedIdentityEnabled(): boolean {
  return featureFlags.unifiedIdentity;
}

export function unifiedIdentityOffResponse(): Response | null {
  if (!isUnifiedIdentityEnabled()) return err("Not found", 404);
  return null;
}

export function isUnifiedBusinessEnabled(): boolean {
  return featureFlags.unifiedBusiness;
}

export function unifiedBusinessOffResponse(): Response | null {
  if (!isUnifiedBusinessEnabled()) return err("Not found", 404);
  return null;
}

export async function requireUnifiedIdentityAuth(
  req: NextRequest
): Promise<{ auth: JwtPayload } | { response: Response }> {
  const off = unifiedIdentityOffResponse();
  if (off) return { response: off };

  const auth = getAuthUser(req);
  if (!auth) return { response: unauthorized() };
  return { auth };
}

export function requireUnifiedBusinessPublic(): { ok: true } | { response: Response } {
  const off = unifiedBusinessOffResponse();
  if (off) return { response: off };
  return { ok: true };
}
