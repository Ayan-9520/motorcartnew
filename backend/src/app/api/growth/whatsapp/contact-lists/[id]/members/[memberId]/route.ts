import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { requireGrowthWorkspace } from "@/lib/growth/guard";
import { removeContactListMember } from "@/services/growth-whatsapp.service";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const gate = await requireGrowthWorkspace(req, "whatsapp");
  if ("response" in gate) return gate.response;

  const { id: listId, memberId } = await params;
  const okDel = await removeContactListMember(
    gate.ctx.workspace.id,
    listId,
    memberId
  );
  if (!okDel) return err("Not found", 404);
  return ok({ deleted: true });
}
