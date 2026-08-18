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
    const data = await orgService().listMembers(actor, id);
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
    const body = (await req.json()) as { email?: string; role?: string; branchId?: string; department?: string };
    if (!body.email) return err("email is required", 400);
    const data = await orgService().addMember(actor, id, {
      email: body.email,
      role: body.role,
      branchId: body.branchId,
      department: body.department,
    });
    return ok({ data }, 201);
  } catch (e) {
    return handleOrganizationError(e);
  }
}
