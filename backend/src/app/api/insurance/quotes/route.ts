import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handlePartnerOsError, partnerActorFrom, readJson } from "@/lib/partneros/http";
import { listCustomerQuotes, listInsurerQuotes, persistPartnerQuote } from "@/services/partner-industry.service";

export async function GET(req: NextRequest) {
  try {
    const actor = partnerActorFrom(req);
    const data = actor.role === "customer" ? await listCustomerQuotes(actor) : await listInsurerQuotes(actor);
    return ok({ data });
  } catch (e) {
    return handlePartnerOsError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req);
    const data = await persistPartnerQuote(partnerActorFrom(req), {
      userId: String(body.userId ?? ""),
      premium: Number(body.premium ?? 0),
    });
    return ok({ data }, 201);
  } catch (e) {
    return handlePartnerOsError(e);
  }
}
