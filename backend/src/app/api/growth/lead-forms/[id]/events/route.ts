import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";
import { requireGrowthWorkspace } from "@/lib/growth/guard";
import {
  getLeadForm,
  listLeadEvents,
  parseLeadStatus,
} from "@/services/growth-lead-form.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireGrowthWorkspace(req, "leads");
  if ("response" in gate) return gate.response;

  const { id } = await params;
  const form = await getLeadForm(gate.ctx.workspace.id, id);
  if (!form) return err("Not found", 404);

  const statusRaw = req.nextUrl.searchParams.get("status");
  const status = statusRaw ? parseLeadStatus(statusRaw) : undefined;
  if (statusRaw && !status) return err("Invalid status", 400);

  const rows = await listLeadEvents(id, gate.ctx.workspace.id, {
    status: status ?? undefined,
    limit: req.nextUrl.searchParams.get("limit")
      ? parseInt(req.nextUrl.searchParams.get("limit")!, 10)
      : undefined,
  });

  return ok({
    data: rows.map((r) => toSnakeRow(r as unknown as Record<string, unknown>)),
  });
}
