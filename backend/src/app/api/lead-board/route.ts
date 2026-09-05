import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handleSalesOsError, isAdminRole, salesActorFrom } from "@/lib/sales-os/http";
import { SalesOsError } from "@/lib/sales-os/errors";
import { listBoard, publishToBoard, withdrawFromBoard } from "@/services/sales-board.service";

export async function GET(req: NextRequest) {
  try {
    const actor = salesActorFrom(req);
    const data = await listBoard(actor);
    return ok({ data });
  } catch (e) {
    return handleSalesOsError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = salesActorFrom(req);
    if (!isAdminRole(actor.role)) throw new SalesOsError("Forbidden", 403, "FORBIDDEN");
    const body = (await req.json()) as Record<string, string | number>;
    if (body.action === "withdraw" && body.id) {
      return ok({ data: await withdrawFromBoard(actor, String(body.id)) });
    }
    const data = await publishToBoard(actor, {
      leadId: String(body.leadId ?? ""),
      creditCost: Number(body.creditCost ?? 0),
      routingMode: String(body.routingMode ?? "SHARED"),
      sharedLimit: typeof body.sharedLimit === "number" ? body.sharedLimit : undefined,
    });
    return ok({ data }, 201);
  } catch (e) {
    return handleSalesOsError(e);
  }
}
