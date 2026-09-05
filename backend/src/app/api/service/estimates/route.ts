import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handlePartnerOsError, partnerActorFrom, readJson } from "@/lib/partneros/http";
import { createEstimate } from "@/services/partner-industry.service";

export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req);
    const items = Array.isArray(body.items) ? (body.items as { description: string; amount: number }[]) : [];
    const data = await createEstimate(partnerActorFrom(req), {
      serviceCenterId: String(body.serviceCenterId ?? ""),
      customerUserId: String(body.customerUserId ?? ""),
      items: items.map((i) => ({ description: String(i.description), amount: Number(i.amount) })),
    });
    return ok({ data }, 201);
  } catch (e) {
    return handlePartnerOsError(e);
  }
}
