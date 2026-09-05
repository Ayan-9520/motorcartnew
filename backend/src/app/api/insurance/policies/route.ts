import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handlePartnerOsError, partnerActorFrom, readJson } from "@/lib/partneros/http";
import { issuePolicy, listPolicies } from "@/services/partner-industry.service";

export async function GET(req: NextRequest) {
  try {
    const data = await listPolicies(partnerActorFrom(req));
    return ok({ data });
  } catch (e) {
    return handlePartnerOsError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req);
    const data = await issuePolicy(partnerActorFrom(req), {
      customerUserId: String(body.customerUserId ?? ""),
      policyNumber: String(body.policyNumber ?? ""),
      policyType: String(body.policyType ?? "comprehensive"),
      startAt: String(body.startAt ?? ""),
      expiryAt: String(body.expiryAt ?? ""),
      premium: body.premium != null ? Number(body.premium) : undefined,
      vehicleId: typeof body.vehicleId === "string" ? body.vehicleId : undefined,
      renewalOfId: typeof body.renewalOfId === "string" ? body.renewalOfId : undefined,
    });
    return ok({ data }, 201);
  } catch (e) {
    return handlePartnerOsError(e);
  }
}
