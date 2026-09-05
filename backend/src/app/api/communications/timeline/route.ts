import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { commActorFrom, handleCommosError } from "@/lib/commos/http";
import { crmTimeline } from "@/services/communication.service";

export async function GET(req: NextRequest) {
  try {
    const actor = commActorFrom(req);
    const leadId = req.nextUrl.searchParams.get("leadId");
    if (!leadId) return ok({ message: "leadId required" }, 400);
    const data = await crmTimeline(actor, leadId);
    return ok({ data });
  } catch (e) {
    return handleCommosError(e);
  }
}
