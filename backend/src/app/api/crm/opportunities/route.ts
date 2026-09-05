import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handleSalesOsError, salesActorFrom } from "@/lib/sales-os/http";
import { createOpportunity, listOpportunities, updateOpportunityStage, linkOpportunityObject } from "@/services/sales-opportunity.service";

export async function GET(req: NextRequest) {
  try {
    const actor = salesActorFrom(req);
    const data = await listOpportunities(actor);
    return ok({ data });
  } catch (e) {
    return handleSalesOsError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = salesActorFrom(req);
    const body = (await req.json()) as Record<string, string | number>;
    if (body.action === "stage" && body.id && body.status) {
      const data = await updateOpportunityStage(actor, String(body.id), String(body.status), body.lostReason ? String(body.lostReason) : undefined);
      return ok({ data });
    }
    if (body.action === "link" && body.id && body.objectType && body.objectId) {
      const data = await linkOpportunityObject(
        actor,
        String(body.id),
        body.objectType === "TEST_DRIVE" ? "TEST_DRIVE" : "QUOTATION",
        String(body.objectId),
      );
      return ok({ data });
    }
    const data = await createOpportunity(actor, {
      leadId: String(body.leadId ?? ""),
      estimatedValue: typeof body.estimatedValue === "number" ? body.estimatedValue : undefined,
      dealerId: body.dealerId ? String(body.dealerId) : undefined,
      organizationId: body.organizationId ? String(body.organizationId) : undefined,
    });
    return ok({ data }, 201);
  } catch (e) {
    return handleSalesOsError(e);
  }
}
