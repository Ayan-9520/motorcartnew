import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handlePartnerOsError, partnerActorFrom, readJson } from "@/lib/partneros/http";
import { createServiceSlot } from "@/services/partner-industry.service";

export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req);
    const data = await createServiceSlot(partnerActorFrom(req), {
      serviceCenterId: String(body.serviceCenterId ?? ""),
      startsAt: String(body.startsAt ?? ""),
      capacity: body.capacity != null ? Number(body.capacity) : undefined,
    });
    return ok({ data }, 201);
  } catch (e) {
    return handlePartnerOsError(e);
  }
}
