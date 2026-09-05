import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handleSalesOsError, salesActorFrom } from "@/lib/sales-os/http";
import { createCrmActivity, listCrmActivities } from "@/services/sales-crm.service";

export async function GET(req: NextRequest) {
  try {
    const actor = salesActorFrom(req);
    const leadId = req.nextUrl.searchParams.get("leadId") ?? undefined;
    const data = await listCrmActivities(actor, leadId);
    return ok({ data });
  } catch (e) {
    return handleSalesOsError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = salesActorFrom(req);
    const body = (await req.json()) as Record<string, string>;
    const data = await createCrmActivity(actor, {
      leadId: body.leadId,
      opportunityId: body.opportunityId,
      activityType: body.activityType,
      subject: body.subject,
      notes: body.notes,
      scheduledAt: body.scheduledAt,
      dealerId: body.dealerId,
      organizationId: body.organizationId,
    });
    return ok({ data }, 201);
  } catch (e) {
    return handleSalesOsError(e);
  }
}
