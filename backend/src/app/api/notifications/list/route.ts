import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireUnifiedNotificationsAuth } from "@/lib/unified-notifications/guard";
import { listUnifiedNotifications } from "@/services/unified-notifications.service";

export async function GET(req: NextRequest) {
  const gate = await requireUnifiedNotificationsAuth(req);
  if ("response" in gate) return gate.response;

  const sp = req.nextUrl.searchParams;
  const data = await listUnifiedNotifications(gate.userId, {
    unread_only: sp.get("unread_only") === "1" || sp.get("unread_only") === "true",
    source: sp.get("source") ?? undefined,
    limit: sp.get("limit") ? parseInt(sp.get("limit")!, 10) : undefined,
    offset: sp.get("offset") ? parseInt(sp.get("offset")!, 10) : undefined,
  });
  return ok({ data });
}
