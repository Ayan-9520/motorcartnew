import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";
import { requireGrowthWorkspace } from "@/lib/growth/guard";
import { handleGrowthServiceError } from "@/lib/growth/http";
import { createLeadForm, listLeadForms } from "@/services/growth-lead-form.service";

export async function GET(req: NextRequest) {
  const gate = await requireGrowthWorkspace(req, "leads");
  if ("response" in gate) return gate.response;

  const rows = await listLeadForms(gate.ctx.workspace.id);
  return ok({
    data: rows.map((r) => toSnakeRow(r as unknown as Record<string, unknown>)),
  });
}

export async function POST(req: NextRequest) {
  const gate = await requireGrowthWorkspace(req, "leads");
  if ("response" in gate) return gate.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  if (!name) return err("name required", 400);

  try {
    const row = await createLeadForm(gate.ctx.workspace.id, {
      name,
      slug: body.slug ? String(body.slug) : undefined,
      fieldsSchema: Array.isArray(body.fields_schema)
        ? body.fields_schema
        : Array.isArray(body.fieldsSchema)
          ? body.fieldsSchema
          : [],
      thankYouUrl: body.thank_you_url
        ? String(body.thank_you_url)
        : body.thankYouUrl
          ? String(body.thankYouUrl)
          : null,
      isActive: body.is_active !== undefined ? Boolean(body.is_active) : undefined,
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
