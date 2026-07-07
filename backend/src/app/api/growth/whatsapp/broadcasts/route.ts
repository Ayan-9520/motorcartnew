import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";
import { requireGrowthWorkspace } from "@/lib/growth/guard";
import { createBroadcast, listBroadcasts } from "@/services/growth-broadcast.service";

export async function GET(req: NextRequest) {
  const gate = await requireGrowthWorkspace(req, "whatsapp");
  if ("response" in gate) return gate.response;

  const rows = await listBroadcasts(gate.ctx.workspace.id);
  return ok({
    data: rows.map((r) => toSnakeRow(r as unknown as Record<string, unknown>)),
  });
}

export async function POST(req: NextRequest) {
  const gate = await requireGrowthWorkspace(req, "whatsapp");
  if ("response" in gate) return gate.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  const templateId = String(body.template_id ?? body.templateId ?? "");
  const listId = String(body.list_id ?? body.listId ?? "");
  if (!name || !templateId || !listId) {
    return err("name, template_id, list_id required", 400);
  }

  const row = await createBroadcast(gate.ctx.workspace.id, {
    name,
    templateId,
    listId,
    scheduleAt: body.schedule_at ? new Date(String(body.schedule_at)) : null,
    metadata:
      body.metadata && typeof body.metadata === "object"
        ? (body.metadata as object)
        : {},
  });
  if (!row) return err("Template or list not found", 404);
  return ok({ data: toSnakeRow(row as unknown as Record<string, unknown>) }, 201);
}
