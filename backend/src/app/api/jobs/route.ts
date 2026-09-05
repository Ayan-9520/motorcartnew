import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handlePartnerOsError, partnerActorFrom, readJson } from "@/lib/partneros/http";
import { createJob, listJobs } from "@/services/partner-industry.service";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const data = await listJobs({
      q: sp.get("q") ?? undefined,
      careerPath: sp.get("careerPath") ?? undefined,
      organizationId: sp.get("organizationId") ?? undefined,
      limit: sp.get("limit") ? Number(sp.get("limit")) : undefined,
      offset: sp.get("offset") ? Number(sp.get("offset")) : undefined,
    });
    return ok({ data });
  } catch (e) {
    return handlePartnerOsError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req);
    const data = await createJob(partnerActorFrom(req), {
      title: String(body.title ?? ""),
      description: String(body.description ?? ""),
      location: typeof body.location === "string" ? body.location : undefined,
      department: typeof body.department === "string" ? body.department : undefined,
      careerPath: typeof body.careerPath === "string" ? body.careerPath : undefined,
      salaryMin: body.salaryMin != null ? Number(body.salaryMin) : undefined,
      salaryMax: body.salaryMax != null ? Number(body.salaryMax) : undefined,
      employmentType: typeof body.employmentType === "string" ? body.employmentType : undefined,
      experience: typeof body.experience === "string" ? body.experience : undefined,
    });
    return ok({ data }, 201);
  } catch (e) {
    return handlePartnerOsError(e);
  }
}
