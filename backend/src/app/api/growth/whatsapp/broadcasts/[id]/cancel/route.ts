import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";
import { requireGrowthWorkspace } from "@/lib/growth/guard";
import { cancelBroadcast } from "@/services/growth-broadcast.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireGrowthWorkspace(req, "whatsapp");
  if ("response" in gate) return gate.response;

  const { id } = await params;
  const row = await cancelBroadcast(gate.ctx.workspace.id, id);
  if (!row) return err("Not found or cannot cancel", 404);
  return ok({ data: toSnakeRow(row as unknown as Record<string, unknown>) });
}
