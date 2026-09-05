import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handlePartnerOsError, partnerActorFrom, readJson } from "@/lib/partneros/http";
import { createJobCard, listJobCards } from "@/services/partner-industry.service";

export async function GET(req: NextRequest) {
  try {
    const data = await listJobCards(partnerActorFrom(req));
    return ok({ data });
  } catch (e) {
    return handlePartnerOsError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req);
    const data = await createJobCard(partnerActorFrom(req), {
      serviceCenterId: String(body.serviceCenterId ?? ""),
      bookingId: typeof body.bookingId === "string" ? body.bookingId : undefined,
      complaint: typeof body.complaint === "string" ? body.complaint : undefined,
      customerUserId: typeof body.customerUserId === "string" ? body.customerUserId : undefined,
    });
    return ok({ data }, 201);
  } catch (e) {
    return handlePartnerOsError(e);
  }
}
