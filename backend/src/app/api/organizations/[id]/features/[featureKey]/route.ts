import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { actorFrom, handleOrganizationError, orgService, organizationLayerOff } from "@/lib/organization/http";

type Ctx = { params: Promise<{ id: string; featureKey: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const off = organizationLayerOff();
  if (off) return off;
  try {
    const actor = actorFrom(req);
    const { id, featureKey } = await ctx.params;
    const data = await orgService().assertFeature(actor, id, featureKey);
    return ok({ data });
  } catch (e) {
    return handleOrganizationError(e);
  }
}
