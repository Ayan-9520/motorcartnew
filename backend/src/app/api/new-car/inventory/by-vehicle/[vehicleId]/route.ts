import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handleDealerInventoryError, inventoryActorFrom, requireDealerInventoryRole } from "@/lib/dealer-inventory/http";
import { DealerInventoryError } from "@/lib/dealer-inventory/errors";
import {
  purgeInventoryForVehicle,
  syncInventoryFromMarketplaceVehicle,
} from "@/services/dealer-inventory.service";

/** Push CRM vehicle edits (images, brand, price) onto linked NewCarInventory. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ vehicleId: string }> }) {
  try {
    const actor = inventoryActorFrom(req);
    requireDealerInventoryRole(actor);
    const { vehicleId } = await params;
    if (!vehicleId?.trim()) throw new DealerInventoryError("vehicleId required", 400, "VEHICLE_REQUIRED");
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const data = await syncInventoryFromMarketplaceVehicle(actor, vehicleId.trim(), body);
    return ok({ data });
  } catch (e) {
    return handleDealerInventoryError(e);
  }
}

/** Delete marketplace vehicle + linked NewCarInventory so /buy/cars/new updates immediately. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ vehicleId: string }> }) {
  try {
    const actor = inventoryActorFrom(req);
    requireDealerInventoryRole(actor);
    const { vehicleId } = await params;
    if (!vehicleId?.trim()) throw new DealerInventoryError("vehicleId required", 400, "VEHICLE_REQUIRED");
    const data = await purgeInventoryForVehicle(actor, vehicleId.trim());
    return ok({ data });
  } catch (e) {
    return handleDealerInventoryError(e);
  }
}
