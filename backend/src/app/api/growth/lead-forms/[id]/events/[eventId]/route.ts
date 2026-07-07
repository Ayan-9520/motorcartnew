import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";
import { requireGrowthWorkspace } from "@/lib/growth/guard";
import {
  parseLeadStatus,
  updateLeadEventStatus,
} from "@/services/growth-lead-form.service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const gate = await requireGrowthWorkspace(req, "leads");
  if ("response" in gate) return gate.response;

  const { id: formId, eventId } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const status = parseLeadStatus(body.status);
  if (!status) return err("Invalid status", 400);

  const row = await updateLeadEventStatus(
    formId,
    gate.ctx.workspace.id,
    eventId,
    status
  );
  if (!row) return err("Not found", 404);
  return ok({ data: toSnakeRow(row as unknown as Record<string, unknown>) });
}
