import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handlePartnerOsError } from "@/lib/partneros/http";
import { publicCompany } from "@/services/partner-industry.service";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const data = await publicCompany(slug);
    return ok({ data });
  } catch (e) {
    return handlePartnerOsError(e);
  }
}
