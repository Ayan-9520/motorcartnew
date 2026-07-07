import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";
import { requireGrowthWorkspace } from "@/lib/growth/guard";
import {
  archiveGrowthDesign,
  getGrowthDesign,
  parseDesignStatus,
  updateGrowthDesign,
} from "@/services/growth-design.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireGrowthWorkspace(req, "posters");
  if ("response" in gate) return gate.response;

  const { id } = await params;
  const row = await getGrowthDesign(gate.ctx.workspace.id, id);
  if (!row) return err("Not found", 404);
  return ok({ data: toSnakeRow(row as unknown as Record<string, unknown>) });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireGrowthWorkspace(req, "posters");
  if ("response" in gate) return gate.response;

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (body.name != null) data.name = String(body.name).trim();
  if (body.canvas_json != null || body.canvasJson != null) {
    data.canvasJson = body.canvas_json ?? body.canvasJson;
  }
  const status = parseDesignStatus(body.status);
  if (status) data.status = status;
  if (body.metadata != null && typeof body.metadata === "object") data.metadata = body.metadata;

  const row = await updateGrowthDesign(gate.ctx.workspace.id, id, data);
  if (!row) return err("Not found", 404);
  return ok({ data: toSnakeRow(row as unknown as Record<string, unknown>) });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireGrowthWorkspace(req, "posters");
  if ("response" in gate) return gate.response;

  const { id } = await params;
  const row = await archiveGrowthDesign(gate.ctx.workspace.id, id);
  if (!row) return err("Not found", 404);
  return ok({ data: toSnakeRow(row as unknown as Record<string, unknown>) });
}
