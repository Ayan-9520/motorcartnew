import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { commActorFrom, handleCommosError } from "@/lib/commos/http";
import { qualifyLead } from "@/services/ai-agent.service";

export async function POST(req: NextRequest) {
  try {
    const actor = commActorFrom(req);
    const body = (await req.json()) as Record<string, unknown>;
    const data = await qualifyLead(actor, String(body.leadId ?? ""), {
      vehicleInterest: typeof body.vehicleInterest === "string" ? body.vehicleInterest : undefined,
      budget: typeof body.budget === "string" ? body.budget : undefined,
      timeline: typeof body.timeline === "string" ? body.timeline : undefined,
      pincode: typeof body.pincode === "string" ? body.pincode : undefined,
      financeRequired: body.financeRequired === true,
      exchangeRequired: body.exchangeRequired === true,
      preferredContact: typeof body.preferredContact === "string" ? body.preferredContact : undefined,
      language: typeof body.language === "string" ? body.language : undefined,
    });
    return ok({ data });
  } catch (e) {
    return handleCommosError(e);
  }
}
