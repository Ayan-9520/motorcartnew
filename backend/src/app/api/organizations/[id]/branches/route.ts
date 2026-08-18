import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { actorFrom, handleOrganizationError, orgService, organizationLayerOff } from "@/lib/organization/http";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const off = organizationLayerOff();
  if (off) return off;
  try {
    const actor = actorFrom(req);
    const { id } = await ctx.params;
    const data = await orgService().listBranches(actor, id);
    return ok({ data });
  } catch (e) {
    return handleOrganizationError(e);
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const off = organizationLayerOff();
  if (off) return off;
  try {
    const actor = actorFrom(req);
    const { id } = await ctx.params;
    const body = (await req.json()) as { name?: string; city?: string; state?: string; postalCode?: string; address?: string; contactNumber?: string; country?: string };
    if (!body.name) return err("name is required", 400);
    const data = await orgService().createBranch(actor, id, {
      name: body.name,
      city: body.city,
      state: body.state,
      postalCode: body.postalCode,
      address: body.address,
      contactNumber: body.contactNumber,
      country: body.country,
    });
    return ok({ data }, 201);
  } catch (e) {
    return handleOrganizationError(e);
  }
}
