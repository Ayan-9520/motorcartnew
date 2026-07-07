import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";
import { requireGrowthWorkspace } from "@/lib/growth/guard";
import { handleGrowthServiceError } from "@/lib/growth/http";
import { getGrowthDesign, stubExportGrowthDesign } from "@/services/growth-design.service";

/** J1 stub export — no renderer; stores placeholder public URL */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireGrowthWorkspace(req, "posters");
  if ("response" in gate) return gate.response;

  const { id } = await params;
  const design = await getGrowthDesign(gate.ctx.workspace.id, id);
  if (!design) return err("Not found", 404);

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const wsId = gate.ctx.workspace.id;
  const publicUrl =
    String(body.public_url ?? body.publicUrl ?? "").trim() ||
    `/uploads/growth/${wsId}/exports/${id}/stub.png`;

  try {
    const row = await stubExportGrowthDesign(wsId, id, publicUrl, {
      format: body.format ? String(body.format) : "png",
      width: body.width != null ? Number(body.width) : design.width,
      height: body.height != null ? Number(body.height) : design.height,
      sizeBytes: body.size_bytes != null ? Number(body.size_bytes) : undefined,
    });
    if (!row) return err("Not found", 404);
    return ok({ data: toSnakeRow(row as unknown as Record<string, unknown>) }, 201);
  } catch (e) {
    const handled = handleGrowthServiceError(e);
    if (handled) return handled;
    throw e;
  }
}
