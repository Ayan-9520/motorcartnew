import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handleSalesOsError, salesActorFrom } from "@/lib/sales-os/http";
import { listAssignments } from "@/services/sales-routing.service";

export async function GET(req: NextRequest) {
  try {
    const actor = salesActorFrom(req);
    const data = await listAssignments(actor, req.nextUrl.searchParams.get("leadId") ?? undefined);
    return ok({ data });
  } catch (e) {
    return handleSalesOsError(e);
  }
}
