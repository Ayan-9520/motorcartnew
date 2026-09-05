import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handleSalesOsError, salesActorFrom } from "@/lib/sales-os/http";
import { getPipeline } from "@/services/sales-opportunity.service";

export async function GET(req: NextRequest) {
  try {
    const actor = salesActorFrom(req);
    const data = await getPipeline(actor);
    return ok({ data });
  } catch (e) {
    return handleSalesOsError(e);
  }
}
