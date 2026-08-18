import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { actorFrom, handleOrganizationError, orgService, organizationLayerOff } from "@/lib/organization/http";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const off = organizationLayerOff();
  if (off) return off;
  try {
    const actor = actorFrom(req);
    const { id } = await ctx.params;
    const data = await orgService().getOrganization(actor, id);
    return ok({ data });
  } catch (e) {
    return handleOrganizationError(e);
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const off = organizationLayerOff();
  if (off) return off;
  try {
    const actor = actorFrom(req);
    const { id } = await ctx.params;
    const body = (await req.json()) as { name?: string; displayName?: string };
    const data = await orgService().updateOrganization(actor, id, body);
    return ok({ data });
  } catch (e) {
    return handleOrganizationError(e);
  }
}
