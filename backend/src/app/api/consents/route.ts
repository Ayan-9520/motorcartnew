import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handleSalesOsError, salesActorFrom } from "@/lib/sales-os/http";
import { createConsent, withdrawConsent } from "@/services/sales-crm.service";

export async function POST(req: NextRequest) {
  try {
    const actor = salesActorFrom(req);
    const body = (await req.json()) as Record<string, string>;
    if (body.action === "withdraw" && body.id) {
      return ok({ data: await withdrawConsent(actor, body.id) });
    }
    const data = await createConsent(actor, {
      leadId: body.leadId,
      channel: body.channel,
      purpose: body.purpose,
      source: body.source || "api",
    });
    return ok({ data }, 201);
  } catch (e) {
    return handleSalesOsError(e);
  }
}
