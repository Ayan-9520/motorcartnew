import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { actorFrom, handleOrganizationError, orgService, organizationLayerOff } from "@/lib/organization/http";

type Ctx = { params: Promise<{ id: string; memberId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const off = organizationLayerOff();
  if (off) return off;
  try {
    const actor = actorFrom(req);
    const { id, memberId } = await ctx.params;
    const body = (await req.json()) as {
      role?: string;
      status?: "active" | "suspended" | "removed";
      branchId?: string | null;
      department?: string | null;
    };
    const data = await orgService().updateMember(actor, id, memberId, body);
    return ok({ data });
  } catch (e) {
    return handleOrganizationError(e);
  }
}
