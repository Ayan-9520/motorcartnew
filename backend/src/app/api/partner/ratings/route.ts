import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handlePartnerOsError, partnerActorFrom, readJson } from "@/lib/partneros/http";
import { submitRating } from "@/services/partner-industry.service";

export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req);
    const data = await submitRating(partnerActorFrom(req), String(body.organizationId ?? ""), {
      overall: Number(body.overall ?? 0),
      response: body.response != null ? Number(body.response) : undefined,
      pricing: body.pricing != null ? Number(body.pricing) : undefined,
      service: body.service != null ? Number(body.service) : undefined,
      experience: body.experience != null ? Number(body.experience) : undefined,
    });
    return ok({ data }, 201);
  } catch (e) {
    return handlePartnerOsError(e);
  }
}
