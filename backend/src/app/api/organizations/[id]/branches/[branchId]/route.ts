import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { actorFrom, handleOrganizationError, orgService, organizationLayerOff } from "@/lib/organization/http";

type Ctx = { params: Promise<{ id: string; branchId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const off = organizationLayerOff();
  if (off) return off;
  try {
    const actor = actorFrom(req);
    const { id, branchId } = await ctx.params;
    const body = (await req.json()) as Record<string, unknown>;
    const data = await orgService().updateBranch(actor, id, branchId, {
      name: typeof body.name === "string" ? body.name : undefined,
      address: typeof body.address === "string" ? body.address : undefined,
      city: typeof body.city === "string" ? body.city : undefined,
      state: typeof body.state === "string" ? body.state : undefined,
      postalCode: typeof body.postalCode === "string" ? body.postalCode : undefined,
      contactNumber: typeof body.contactNumber === "string" ? body.contactNumber : undefined,
      isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
    });
    return ok({ data });
  } catch (e) {
    return handleOrganizationError(e);
  }
}
