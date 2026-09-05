import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handlePartnerOsError, partnerActorFrom, readJson } from "@/lib/partneros/http";
import { grantCertification } from "@/services/partner-industry.service";

export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req);
    const evidence = body.evidence && typeof body.evidence === "object" ? (body.evidence as Record<string, unknown>) : {};
    const data = await grantCertification(
      partnerActorFrom(req),
      String(body.organizationId ?? ""),
      String(body.code ?? ""),
      evidence,
    );
    return ok({ data }, 201);
  } catch (e) {
    return handlePartnerOsError(e);
  }
}
