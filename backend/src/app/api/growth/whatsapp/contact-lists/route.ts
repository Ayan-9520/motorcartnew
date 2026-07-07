import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";
import { requireGrowthWorkspace } from "@/lib/growth/guard";
import {
  createContactList,
  listContactLists,
} from "@/services/growth-whatsapp.service";

export async function GET(req: NextRequest) {
  const gate = await requireGrowthWorkspace(req, "whatsapp");
  if ("response" in gate) return gate.response;

  const rows = await listContactLists(gate.ctx.workspace.id);
  return ok({
    data: rows.map((r) => toSnakeRow(r as unknown as Record<string, unknown>)),
  });
}

export async function POST(req: NextRequest) {
  const gate = await requireGrowthWorkspace(req, "whatsapp");
  if ("response" in gate) return gate.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  if (!name) return err("name required", 400);

  const row = await createContactList(gate.ctx.workspace.id, {
    name,
    description: body.description ? String(body.description) : null,
    metadata:
      body.metadata && typeof body.metadata === "object"
        ? (body.metadata as object)
        : {},
  });
  return ok({ data: toSnakeRow(row as unknown as Record<string, unknown>) }, 201);
}
