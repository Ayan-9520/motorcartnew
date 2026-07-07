import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireUnifiedNotificationsAuth } from "@/lib/unified-notifications/guard";
import { markNotificationReadUnified } from "@/services/unified-notifications.service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireUnifiedNotificationsAuth(req);
  if ("response" in gate) return gate.response;

  const { id } = await params;
  const unifiedId = decodeURIComponent(id);
  const data = await markNotificationReadUnified(gate.userId, unifiedId);
  return ok({ data });
}
