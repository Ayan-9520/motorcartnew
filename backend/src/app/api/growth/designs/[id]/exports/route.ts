import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";
import { requireGrowthWorkspace } from "@/lib/growth/guard";
import { getGrowthDesign, listDesignExports } from "@/services/growth-design.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireGrowthWorkspace(req, "posters");
  if ("response" in gate) return gate.response;

  const { id } = await params;
  const design = await getGrowthDesign(gate.ctx.workspace.id, id);
  if (!design) return err("Not found", 404);

  const rows = await listDesignExports(id);
  return ok({
    data: rows.map((r) => toSnakeRow(r as unknown as Record<string, unknown>)),
  });
}
