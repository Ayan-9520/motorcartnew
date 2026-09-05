import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handlePartnerOsError } from "@/lib/partneros/http";
import { publicOrgBySlug } from "@/lib/partneros/access";
import { listJobs } from "@/services/partner-industry.service";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const org = await publicOrgBySlug(slug);
    const data = await listJobs({ organizationId: org.id });
    return ok({ data, organization: { slug: org.slug, name: org.displayName } });
  } catch (e) {
    return handlePartnerOsError(e);
  }
}
