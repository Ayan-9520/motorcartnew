import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";
import { requireGrowthWorkspace } from "@/lib/growth/guard";
import { scheduleBroadcast } from "@/services/growth-broadcast.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireGrowthWorkspace(req, "whatsapp");
  if ("response" in gate) return gate.response;

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const scheduleAt = body.schedule_at ?? body.scheduleAt;
  if (!scheduleAt) return err("schedule_at required", 400);

  const row = await scheduleBroadcast(
    gate.ctx.workspace.id,
    id,
    new Date(String(scheduleAt))
  );
  if (!row) return err("Not found", 404);
  return ok({ data: toSnakeRow(row as unknown as Record<string, unknown>) });
}
