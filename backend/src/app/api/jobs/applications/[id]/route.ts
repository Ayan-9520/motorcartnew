import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handlePartnerOsError, partnerActorFrom, readJson } from "@/lib/partneros/http";
import { setApplicationStatus, withdrawApplication } from "@/services/partner-industry.service";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await readJson(req);
    const actor = partnerActorFrom(req);
    if (body.status === "WITHDRAWN" || body.withdraw === true) {
      const data = await withdrawApplication(actor, id);
      return ok({ data });
    }
    const data = await setApplicationStatus(actor, id, String(body.status ?? ""));
    return ok({ data });
  } catch (e) {
    return handlePartnerOsError(e);
  }
}
