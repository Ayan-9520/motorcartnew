import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handlePartnerOsError } from "@/lib/partneros/http";
import { getJob } from "@/services/partner-industry.service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const data = await getJob(id);
    return ok({ data });
  } catch (e) {
    return handlePartnerOsError(e);
  }
}
