import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handleSalesOsError, isAdminRole, salesActorFrom } from "@/lib/sales-os/http";
import { SalesOsError } from "@/lib/sales-os/errors";
import { getCredits, grantCredits } from "@/services/sales-board.service";

export async function GET(req: NextRequest) {
  try {
    const actor = salesActorFrom(req);
    const data = await getCredits(actor);
    return ok({ data });
  } catch (e) {
    return handleSalesOsError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = salesActorFrom(req);
    if (!isAdminRole(actor.role)) throw new SalesOsError("Forbidden", 403, "FORBIDDEN");
    const body = (await req.json()) as { dealerId?: string; amount?: number; reason?: string };
    const data = await grantCredits(actor, String(body.dealerId ?? ""), Number(body.amount ?? 0), body.reason || "admin_grant");
    return ok({ data });
  } catch (e) {
    return handleSalesOsError(e);
  }
}
