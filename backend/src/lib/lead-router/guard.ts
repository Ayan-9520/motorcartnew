import type { NextRequest } from "next/server";
import { featureFlags } from "@/config/feature-flags";
import { getAuthUser } from "@/lib/auth/middleware";
import { err, unauthorized } from "@/lib/api-response";

export function isLeadRouterEnabled(): boolean {
  return featureFlags.leadRouter;
}

export function leadRouterOffResponse(): Response | null {
  if (!isLeadRouterEnabled()) return err("Not found", 404);
  return null;
}

export function requireLeadRouterPublic(): { ok: true } | { response: Response } {
  const off = leadRouterOffResponse();
  if (off) return { response: off };
  return { ok: true };
}

export async function requireLeadRouterAuth(
  req: NextRequest
): Promise<{ userId: string } | { response: Response }> {
  const off = leadRouterOffResponse();
  if (off) return { response: off };

  const auth = getAuthUser(req);
  if (!auth) return { response: unauthorized() };
  return { userId: auth.sub };
}
