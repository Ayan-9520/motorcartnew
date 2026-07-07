import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";
import { requireGrowthWorkspace } from "@/lib/growth/guard";
import { handleGrowthServiceError } from "@/lib/growth/http";
import {
  createWhatsappTemplate,
  listWhatsappTemplates,
} from "@/services/growth-whatsapp.service";

export async function GET(req: NextRequest) {
  const gate = await requireGrowthWorkspace(req, "whatsapp");
  if ("response" in gate) return gate.response;

  const rows = await listWhatsappTemplates(gate.ctx.workspace.id);
  return ok({
    data: rows.map((r) => toSnakeRow(r as unknown as Record<string, unknown>)),
  });
}

export async function POST(req: NextRequest) {
  const gate = await requireGrowthWorkspace(req, "whatsapp");
  if ("response" in gate) return gate.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const templateKey = String(body.template_key ?? body.templateKey ?? "").trim();
  const name = String(body.name ?? "").trim();
  const templateBody = String(body.body ?? "").trim();
  if (!templateKey || !name || !templateBody) {
    return err("template_key, name, body required", 400);
  }

  try {
    const row = await createWhatsappTemplate(gate.ctx.workspace.id, {
      templateKey,
      name,
      body: templateBody,
      category: body.category ? String(body.category) : undefined,
      language: body.language ? String(body.language) : undefined,
      variablesSchema: Array.isArray(body.variables_schema)
        ? body.variables_schema
        : Array.isArray(body.variablesSchema)
          ? body.variablesSchema
          : [],
      metadata:
        body.metadata && typeof body.metadata === "object"
          ? (body.metadata as object)
          : {},
    });
    return ok({ data: toSnakeRow(row as unknown as Record<string, unknown>) }, 201);
  } catch (e) {
    const handled = handleGrowthServiceError(e);
    if (handled) return handled;
    throw e;
  }
}
