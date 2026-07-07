import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireUnifiedNotificationsAuth } from "@/lib/unified-notifications/guard";
import { getUnifiedNotificationsOverview } from "@/services/unified-notifications.service";

export async function GET(req: NextRequest) {
  const gate = await requireUnifiedNotificationsAuth(req);
  if ("response" in gate) return gate.response;

  const data = await getUnifiedNotificationsOverview(gate.userId);
  return ok({ data });
}
