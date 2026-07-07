import type { NextRequest } from "next/server";
import { featureFlags } from "@/config/feature-flags";
import { getAuthUser } from "@/lib/auth/middleware";
import { err, unauthorized } from "@/lib/api-response";

export function isUnifiedNotificationsEnabled(): boolean {
  return featureFlags.unifiedNotifications;
}

export function unifiedNotificationsOffResponse(): Response | null {
  if (!isUnifiedNotificationsEnabled()) return err("Not found", 404);
  return null;
}

export async function requireUnifiedNotificationsAuth(
  req: NextRequest
): Promise<{ userId: string } | { response: Response }> {
  const off = unifiedNotificationsOffResponse();
  if (off) return { response: off };

  const auth = getAuthUser(req);
  if (!auth) return { response: unauthorized() };
  return { userId: auth.sub };
}
