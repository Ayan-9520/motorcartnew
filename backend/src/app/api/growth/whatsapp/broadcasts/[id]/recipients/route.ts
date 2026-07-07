import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";
import { requireGrowthWorkspace } from "@/lib/growth/guard";
import {
  getBroadcast,
  listBroadcastRecipients,
} from "@/services/growth-broadcast.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireGrowthWorkspace(req, "whatsapp");
  if ("response" in gate) return gate.response;

  const { id } = await params;
  const broadcast = await getBroadcast(gate.ctx.workspace.id, id);
  if (!broadcast) return err("Not found", 404);

  const rows = await listBroadcastRecipients(id, gate.ctx.workspace.id);
  return ok({
    data: rows.map((r) => toSnakeRow(r as unknown as Record<string, unknown>)),
  });
}
