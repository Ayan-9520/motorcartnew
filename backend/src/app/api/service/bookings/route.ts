import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handlePartnerOsError, partnerActorFrom, readJson } from "@/lib/partneros/http";
import { requestServiceBooking } from "@/services/partner-industry.service";

export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req);
    const data = await requestServiceBooking(partnerActorFrom(req), {
      serviceCenterId: String(body.serviceCenterId ?? ""),
      slotId: typeof body.slotId === "string" ? body.slotId : undefined,
      scheduledAt: typeof body.scheduledAt === "string" ? body.scheduledAt : undefined,
    });
    return ok({ data }, 201);
  } catch (e) {
    return handlePartnerOsError(e);
  }
}
