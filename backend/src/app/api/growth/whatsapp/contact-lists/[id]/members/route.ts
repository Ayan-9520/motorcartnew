import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";
import { requireGrowthWorkspace } from "@/lib/growth/guard";
import { addContactListMembers } from "@/services/growth-whatsapp.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireGrowthWorkspace(req, "whatsapp");
  if ("response" in gate) return gate.response;

  const { id: listId } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const rawMembers = (body.members ?? body) as unknown;
  const membersArr = Array.isArray(rawMembers) ? rawMembers : [rawMembers];

  const members = membersArr
    .filter((m) => m && typeof m === "object")
    .map((m) => {
      const row = m as Record<string, unknown>;
      return {
        phone: String(row.phone ?? ""),
        fullName: row.full_name != null ? String(row.full_name) : row.fullName != null ? String(row.fullName) : null,
      };
    })
    .filter((m) => m.phone.trim());

  if (!members.length) return err("members with phone required", 400);

  const created = await addContactListMembers(listId, gate.ctx.workspace.id, members);
  if (!created) return err("List not found", 404);

  return ok({
    data: created.map((r) => toSnakeRow(r as unknown as Record<string, unknown>)),
  }, 201);
}
