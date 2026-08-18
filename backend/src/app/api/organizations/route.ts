import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import {
  actorFrom,
  handleOrganizationError,
  orgService,
  organizationLayerOff,
} from "@/lib/organization/http";
import { isOrganizationType } from "@/lib/organization/organization.types";

export async function GET(req: NextRequest) {
  const off = organizationLayerOff();
  if (off) return off;
  try {
    const actor = actorFrom(req);
    const data = await orgService().listMine(actor);
    return ok({ data });
  } catch (e) {
    return handleOrganizationError(e);
  }
}

export async function POST(req: NextRequest) {
  const off = organizationLayerOff();
  if (off) return off;
  try {
    const actor = actorFrom(req);
    const body = (await req.json()) as { name?: string; displayName?: string; type?: string };
    if (!body.name) return err("name is required", 400);
    const org = await orgService().createOrganization(actor, {
      name: body.name,
      displayName: body.displayName,
      type: body.type && isOrganizationType(body.type) ? body.type : undefined,
    });
    return ok({ data: org }, 201);
  } catch (e) {
    return handleOrganizationError(e);
  }
}
