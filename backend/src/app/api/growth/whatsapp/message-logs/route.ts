import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";
import { requireGrowthWorkspace } from "@/lib/growth/guard";
import { listMessageLogs } from "@/services/growth-broadcast.service";

export async function GET(req: NextRequest) {
  const gate = await requireGrowthWorkspace(req, "whatsapp");
  if ("response" in gate) return gate.response;

  const broadcastId =
    req.nextUrl.searchParams.get("broadcast_id") ??
    req.nextUrl.searchParams.get("broadcastId") ??
    undefined;

  const rows = await listMessageLogs(gate.ctx.workspace.id, broadcastId);
  return ok({
    data: rows.map((r) => toSnakeRow(r as unknown as Record<string, unknown>)),
  });
}
