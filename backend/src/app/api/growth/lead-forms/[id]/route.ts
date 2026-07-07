import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";
import { requireGrowthWorkspace } from "@/lib/growth/guard";
import { getLeadForm, updateLeadForm } from "@/services/growth-lead-form.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireGrowthWorkspace(req, "leads");
  if ("response" in gate) return gate.response;

  const { id } = await params;
  const row = await getLeadForm(gate.ctx.workspace.id, id);
  if (!row) return err("Not found", 404);
  return ok({ data: toSnakeRow(row as unknown as Record<string, unknown>) });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireGrowthWorkspace(req, "leads");
  if ("response" in gate) return gate.response;

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (body.name != null) data.name = String(body.name);
  if (body.is_active !== undefined || body.isActive !== undefined) {
    data.isActive = Boolean(body.is_active ?? body.isActive);
  }
  if (body.fields_schema != null || body.fieldsSchema != null) {
    data.fieldsSchema = body.fields_schema ?? body.fieldsSchema;
  }
  if (body.thank_you_url !== undefined || body.thankYouUrl !== undefined) {
    data.thankYouUrl = body.thank_you_url ?? body.thankYouUrl ?? null;
  }

  const row = await updateLeadForm(gate.ctx.workspace.id, id, data);
  if (!row) return err("Not found", 404);
  return ok({ data: toSnakeRow(row as unknown as Record<string, unknown>) });
}
