import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handleSalesOsError, salesActorFrom } from "@/lib/sales-os/http";
import { listLeadCalls, logLeadCall } from "@/services/sales-crm.service";

export async function GET(req: NextRequest) {
  try {
    const actor = salesActorFrom(req);
    const data = await listLeadCalls(actor, req.nextUrl.searchParams.get("leadId") ?? undefined);
    return ok({ data });
  } catch (e) {
    return handleSalesOsError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = salesActorFrom(req);
    const body = (await req.json()) as Record<string, string | number>;
    const data = await logLeadCall(actor, {
      leadId: String(body.leadId ?? ""),
      disposition: String(body.disposition ?? ""),
      notes: body.notes ? String(body.notes) : undefined,
      followUpAt: body.followUpAt ? String(body.followUpAt) : undefined,
      durationSeconds: typeof body.durationSeconds === "number" ? body.durationSeconds : undefined,
      dealerId: body.dealerId ? String(body.dealerId) : undefined,
    });
    return ok({ data }, 201);
  } catch (e) {
    return handleSalesOsError(e);
  }
}
