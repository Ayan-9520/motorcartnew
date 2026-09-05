import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handleSalesOsError, salesActorFrom } from "@/lib/sales-os/http";
import { listCrmLeads, overrideLeadQuality } from "@/services/sales-crm.service";

export async function GET(req: NextRequest) {
  try {
    const actor = salesActorFrom(req);
    const data = await listCrmLeads(actor);
    return ok({ data });
  } catch (e) {
    return handleSalesOsError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const actor = salesActorFrom(req);
    const body = (await req.json()) as { leadId?: string; quality?: string; reason?: string };
    if (!body.leadId || !body.quality) {
      return ok({ message: "leadId and quality required" }, 400);
    }
    const data = await overrideLeadQuality(actor, body.leadId, body.quality, body.reason);
    return ok({ data });
  } catch (e) {
    return handleSalesOsError(e);
  }
}
