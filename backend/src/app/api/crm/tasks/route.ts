import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handleSalesOsError, salesActorFrom } from "@/lib/sales-os/http";
import { cancelFollowUp, completeFollowUp, createFollowUp, listFollowUps } from "@/services/sales-crm.service";

export async function GET(req: NextRequest) {
  try {
    const actor = salesActorFrom(req);
    const bucket = req.nextUrl.searchParams.get("bucket") as "overdue" | "today" | "upcoming" | null;
    const data = await listFollowUps(actor, bucket ?? undefined);
    return ok({ data });
  } catch (e) {
    return handleSalesOsError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = salesActorFrom(req);
    const body = (await req.json()) as Record<string, string>;
    if (body.action === "complete" && body.taskId) {
      return ok({ data: await completeFollowUp(actor, body.taskId) });
    }
    if (body.action === "cancel" && body.taskId) {
      return ok({ data: await cancelFollowUp(actor, body.taskId) });
    }
    const data = await createFollowUp(actor, {
      leadId: body.leadId,
      opportunityId: body.opportunityId,
      title: body.title,
      dueAt: body.dueAt,
      assignedTo: body.assignedTo,
      description: body.description,
    });
    return ok({ data }, 201);
  } catch (e) {
    return handleSalesOsError(e);
  }
}
