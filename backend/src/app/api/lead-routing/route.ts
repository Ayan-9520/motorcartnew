import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handleSalesOsError, isAdminRole, salesActorFrom } from "@/lib/sales-os/http";
import { SalesOsError } from "@/lib/sales-os/errors";
import { adminRoutingOverview, listAssignments, manualAssign, routeLeadByPin } from "@/services/sales-routing.service";

export async function GET(req: NextRequest) {
  try {
    const actor = salesActorFrom(req);
    if (!isAdminRole(actor.role)) throw new SalesOsError("Forbidden", 403, "FORBIDDEN");
    const data = await adminRoutingOverview();
    return ok({ data });
  } catch (e) {
    return handleSalesOsError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = salesActorFrom(req);
    if (!isAdminRole(actor.role)) throw new SalesOsError("Forbidden", 403, "FORBIDDEN");
    const body = (await req.json()) as Record<string, string>;
    if (body.action === "route" && body.leadId) {
      return ok({ data: await routeLeadByPin(body.leadId, actor) });
    }
    if (body.action === "assign" && body.leadId && body.dealerId) {
      return ok({ data: await manualAssign(actor, body.leadId, body.dealerId, body.reason || "admin") });
    }
    throw new SalesOsError("Unknown action", 400, "UNKNOWN_ACTION");
  } catch (e) {
    return handleSalesOsError(e);
  }
}
