import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { actorFrom, handleOrganizationError, orgService, organizationLayerOff } from "@/lib/organization/http";

/** Current user's organizations; lazily provisions a dealer org from the existing Dealer row. */
export async function GET(req: NextRequest) {
  const off = organizationLayerOff();
  if (off) return off;
  try {
    const actor = actorFrom(req);
    const ensured = await orgService().ensureForBusinessUser(actor);
    const data = await orgService().listMine(actor);
    return ok({ data, current: ensured });
  } catch (e) {
    return handleOrganizationError(e);
  }
}
