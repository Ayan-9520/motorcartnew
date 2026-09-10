import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { DealerInventoryError } from "@/lib/dealer-inventory/errors";
import { handleDealerInventoryError, inventoryActorFrom, requireDealerInventoryRole } from "@/lib/dealer-inventory/http";
import {
  clearDealerInventory,
  createDealerInventoryItem,
  listDealerInventory,
} from "@/services/dealer-inventory.service";

export async function GET(req: NextRequest) {
  try {
    const actor = inventoryActorFrom(req);
    requireDealerInventoryRole(actor);
    const sp = req.nextUrl.searchParams;
    const data = await listDealerInventory(actor, {
      dealerId: sp.get("dealer_id") ?? sp.get("dealerId"),
      q: sp.get("q") ?? undefined,
      brand: sp.get("brand") ?? undefined,
      stockStatus: sp.get("stock_status") ?? sp.get("stockStatus") ?? undefined,
      page: sp.get("page") ? Number(sp.get("page")) : 1,
      pageSize: sp.get("pageSize") ? Number(sp.get("pageSize")) : 50,
    });
    return ok(data);
  } catch (e) {
    return handleDealerInventoryError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = inventoryActorFrom(req);
    requireDealerInventoryRole(actor);
    const body = (await req.json()) as Record<string, unknown>;
    const data = await createDealerInventoryItem(actor, body);
    return ok({ data });
  } catch (e) {
    return handleDealerInventoryError(e);
  }
}

/** DELETE /api/new-car/inventory?all=1&dealer_id=… — wipe showroom stock for re-upload. */
export async function DELETE(req: NextRequest) {
  try {
    const actor = inventoryActorFrom(req);
    requireDealerInventoryRole(actor);
    const sp = req.nextUrl.searchParams;
    const all = sp.get("all") === "1" || sp.get("all") === "true";
    if (!all) {
      throw new DealerInventoryError("Pass all=1 to clear entire inventory", 400, "BAD_REQUEST");
    }
    const data = await clearDealerInventory(actor, sp.get("dealer_id") ?? sp.get("dealerId"));
    return ok({ data });
  } catch (e) {
    return handleDealerInventoryError(e);
  }
}
