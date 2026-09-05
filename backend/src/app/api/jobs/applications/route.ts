import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handlePartnerOsError, partnerActorFrom } from "@/lib/partneros/http";
import { listEmployerApplications, listMyApplications } from "@/services/partner-industry.service";

export async function GET(req: NextRequest) {
  try {
    const actor = partnerActorFrom(req);
    const mine = req.nextUrl.searchParams.get("mine") === "1" || actor.role === "customer";
    const jobId = req.nextUrl.searchParams.get("jobId") ?? undefined;
    const data = mine ? await listMyApplications(actor) : await listEmployerApplications(actor, jobId);
    return ok({ data });
  } catch (e) {
    return handlePartnerOsError(e);
  }
}
