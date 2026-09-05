import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handlePartnerOsError, partnerActorFrom, readJson } from "@/lib/partneros/http";
import { decideEstimateItem } from "@/services/partner-industry.service";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await readJson(req);
    const data = await decideEstimateItem(partnerActorFrom(req), id, Boolean(body.approve));
    return ok({ data });
  } catch (e) {
    return handlePartnerOsError(e);
  }
}
