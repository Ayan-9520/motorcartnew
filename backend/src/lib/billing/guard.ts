import type { NextRequest } from "next/server";
import { featureFlags } from "@/config/feature-flags";
import { getAuthUser } from "@/lib/auth/middleware";
import { err, unauthorized } from "@/lib/api-response";

export function isBillingV2Enabled(): boolean {
  return featureFlags.billingV2;
}

export function billingV2OffResponse(): Response | null {
  if (!isBillingV2Enabled()) return err("Not found", 404);
  return null;
}

export function requireBillingPublic(): { ok: true } | { response: Response } {
  const off = billingV2OffResponse();
  if (off) return { response: off };
  return { ok: true };
}

export async function requireBillingAuth(
  req: NextRequest
): Promise<{ userId: string; role: string } | { response: Response }> {
  const off = billingV2OffResponse();
  if (off) return { response: off };

  const auth = getAuthUser(req);
  if (!auth) return { response: unauthorized() };
  return { userId: auth.sub, role: String(auth.role) };
}
