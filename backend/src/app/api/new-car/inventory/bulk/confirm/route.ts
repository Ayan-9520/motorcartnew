import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handleDealerInventoryError, inventoryActorFrom, requireDealerInventoryRole } from "@/lib/dealer-inventory/http";
import { DealerInventoryError } from "@/lib/dealer-inventory/errors";
import { confirmDealerInventoryImport } from "@/services/dealer-inventory.service";

export async function POST(req: NextRequest) {
  try {
    const actor = inventoryActorFrom(req);
    requireDealerInventoryRole(actor);
    const body = (await req.json()) as { batchId?: string; batch_id?: string };
    const batchId = String(body.batchId ?? body.batch_id ?? "").trim();
    if (!batchId) throw new DealerInventoryError("batchId is required", 400, "BATCH_REQUIRED");
    const data = await confirmDealerInventoryImport(actor, batchId);
    return ok({ data });
  } catch (e) {
    return handleDealerInventoryError(e);
  }
}
