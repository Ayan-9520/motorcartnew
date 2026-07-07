import type { NextRequest } from "next/server";
import { featureFlags } from "@/config/feature-flags";
import { getAuthUser } from "@/lib/auth/middleware";
import type { JwtPayload } from "@/lib/auth/jwt";
import { err, unauthorized } from "@/lib/api-response";

export function isDirectoryEnabled(): boolean {
  return featureFlags.businessDirectoryV2;
}

export function isDirectoryMonetizationEnabled(): boolean {
  return featureFlags.businessDirectoryV2 && featureFlags.directoryMonetizationK1;
}

export function directoryMonetizationOffResponse(): Response | null {
  if (!isDirectoryMonetizationEnabled()) return err("Not found", 404);
  return null;
}

export function directoryOffResponse(): Response | null {
  if (!isDirectoryEnabled()) return err("Not found", 404);
  return null;
}

export function requireDirectoryPublic(): { ok: true } | { response: Response } {
  const off = directoryOffResponse();
  if (off) return { response: off };
  return { ok: true };
}

export async function requireDirectoryAuth(
  req: NextRequest
): Promise<{ auth: JwtPayload } | { response: Response }> {
  const off = directoryOffResponse();
  if (off) return { response: off };

  const auth = getAuthUser(req);
  if (!auth) return { response: unauthorized() };
  return { auth };
}
