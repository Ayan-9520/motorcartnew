import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handlePartnerOsError, partnerActorFrom } from "@/lib/partneros/http";
import { getPartOrder } from "@/services/partner-industry.service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const data = await getPartOrder(partnerActorFrom(req), id);
    return ok({ data });
  } catch (e) {
    return handlePartnerOsError(e);
  }
}
