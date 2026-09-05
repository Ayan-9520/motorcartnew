import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handlePartnerOsError } from "@/lib/partneros/http";
import { publicProfessional } from "@/services/partner-industry.service";

type Ctx = { params: Promise<{ userId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { userId } = await ctx.params;
    const data = await publicProfessional(userId);
    return ok({ data });
  } catch (e) {
    return handlePartnerOsError(e);
  }
}
