import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handleSalesOsError, salesActorFrom } from "@/lib/sales-os/http";
import { listCoverage, upsertCoverage } from "@/services/sales-routing.service";

export async function GET(req: NextRequest) {
  try {
    const actor = salesActorFrom(req);
    const data = await listCoverage(actor);
    return ok({ data });
  } catch (e) {
    return handleSalesOsError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = salesActorFrom(req);
    const body = (await req.json()) as Record<string, string | number | null>;
    const data = await upsertCoverage(actor, {
      dealerId: body.dealerId ? String(body.dealerId) : undefined,
      domain: body.domain ? String(body.domain) : undefined,
      postalCode: String(body.postalCode ?? ""),
      priority: typeof body.priority === "number" ? body.priority : undefined,
      routingMode: body.routingMode ? String(body.routingMode) : undefined,
      capacity: typeof body.capacity === "number" ? body.capacity : null,
      organizationId: body.organizationId ? String(body.organizationId) : undefined,
    });
    return ok({ data }, 201);
  } catch (e) {
    return handleSalesOsError(e);
  }
}
