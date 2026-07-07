import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";
import { requireGrowthWorkspace } from "@/lib/growth/guard";
import {
  getGrowthAsset,
  softDeleteGrowthAsset,
} from "@/services/growth-asset.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireGrowthWorkspace(req, "assets");
  if ("response" in gate) return gate.response;

  const { id } = await params;
  const row = await getGrowthAsset(gate.ctx.workspace.id, id);
  if (!row) return err("Not found", 404);
  return ok({ data: toSnakeRow(row as unknown as Record<string, unknown>) });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireGrowthWorkspace(req, "assets");
  if ("response" in gate) return gate.response;

  const { id } = await params;
  const okDel = await softDeleteGrowthAsset(gate.ctx.workspace.id, id);
  if (!okDel) return err("Not found", 404);
  return ok({ deleted: true });
}
