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
    const data = await orgService().getProfile(actor, id);
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
    const body = (await req.json()) as Record<string, unknown>;
    const data = await orgService().updateProfile(actor, id, {
      businessName: typeof body.businessName === "string" ? body.businessName : undefined,
      displayName: typeof body.displayName === "string" ? body.displayName : undefined,
      logoUrl: typeof body.logoUrl === "string" ? body.logoUrl : undefined,
      description: typeof body.description === "string" ? body.description : undefined,
      email: typeof body.email === "string" ? body.email : undefined,
      phone: typeof body.phone === "string" ? body.phone : undefined,
      website: typeof body.website === "string" ? body.website : undefined,
    });
    return ok({ data });
  } catch (e) {
    return handleOrganizationError(e);
  }
}
