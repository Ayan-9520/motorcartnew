import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";
import { requireGrowthWorkspace } from "@/lib/growth/guard";
import {
  deleteWhatsappTemplate,
  getWhatsappTemplate,
  parseTemplateStatus,
  updateWhatsappTemplate,
} from "@/services/growth-whatsapp.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireGrowthWorkspace(req, "whatsapp");
  if ("response" in gate) return gate.response;

  const { id } = await params;
  const row = await getWhatsappTemplate(gate.ctx.workspace.id, id);
  if (!row) return err("Not found", 404);
  return ok({ data: toSnakeRow(row as unknown as Record<string, unknown>) });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireGrowthWorkspace(req, "whatsapp");
  if ("response" in gate) return gate.response;

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (body.name != null) data.name = String(body.name);
  if (body.body != null) data.body = String(body.body);
  const status = parseTemplateStatus(body.status);
  if (status) data.status = status;
  if (body.metadata != null && typeof body.metadata === "object") data.metadata = body.metadata;

  const row = await updateWhatsappTemplate(gate.ctx.workspace.id, id, data);
  if (!row) return err("Not found", 404);
  return ok({ data: toSnakeRow(row as unknown as Record<string, unknown>) });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireGrowthWorkspace(req, "whatsapp");
  if ("response" in gate) return gate.response;

  const { id } = await params;
  const okDel = await deleteWhatsappTemplate(gate.ctx.workspace.id, id);
  if (!okDel) return err("Not found", 404);
  return ok({ deleted: true });
}
