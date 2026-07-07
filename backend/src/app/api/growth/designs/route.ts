import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";
import { requireGrowthWorkspace } from "@/lib/growth/guard";
import {
  createGrowthDesign,
  listGrowthDesigns,
  parseDesignFormat,
  parseDesignStatus,
} from "@/services/growth-design.service";

export async function GET(req: NextRequest) {
  const gate = await requireGrowthWorkspace(req, "posters");
  if ("response" in gate) return gate.response;

  const statusRaw = req.nextUrl.searchParams.get("status");
  let statusFilter: NonNullable<ReturnType<typeof parseDesignStatus>> | undefined;
  if (statusRaw) {
    const parsed = parseDesignStatus(statusRaw);
    if (!parsed) return err("Invalid status", 400);
    statusFilter = parsed;
  }

  const rows = await listGrowthDesigns(gate.ctx.workspace.id, statusFilter);
  return ok({
    data: rows.map((r) => toSnakeRow(r as unknown as Record<string, unknown>)),
  });
}

export async function POST(req: NextRequest) {
  const gate = await requireGrowthWorkspace(req, "posters");
  if ("response" in gate) return gate.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  const format = parseDesignFormat(body.format);
  if (!name || !format) return err("name and format required", 400);

  const row = await createGrowthDesign(gate.ctx.workspace.id, {
    name,
    format,
    canvasJson:
      body.canvas_json ?? body.canvasJson ?? { layers: [] },
    width: body.width != null ? Number(body.width) : undefined,
    height: body.height != null ? Number(body.height) : undefined,
    metadata:
      body.metadata && typeof body.metadata === "object"
        ? (body.metadata as object)
        : {},
  });

  return ok({ data: toSnakeRow(row as unknown as Record<string, unknown>) }, 201);
}
