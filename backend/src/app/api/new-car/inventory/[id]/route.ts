import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { toSnakeRow } from "@/lib/db/table-map";
import { requireDealerContext } from "@/lib/sales-os/access";
import { DealerInventoryError } from "@/lib/dealer-inventory/errors";
import { handleDealerInventoryError, inventoryActorFrom, requireDealerInventoryRole } from "@/lib/dealer-inventory/http";
import {
  archiveDealerInventoryItem,
  updateDealerInventoryItem,
  updateDealerInventoryStock,
} from "@/services/dealer-inventory.service";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = inventoryActorFrom(req);
    requireDealerInventoryRole(actor);
    const { id } = await params;
    const row = await prisma.newCarInventory.findUnique({ where: { id } });
    if (!row) throw new DealerInventoryError("Inventory not found", 404, "NOT_FOUND");
    await requireDealerContext(actor, row.dealerId);
    return ok({ data: toSnakeRow(row as unknown as Record<string, unknown>) });
  } catch (e) {
    return handleDealerInventoryError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = inventoryActorFrom(req);
    requireDealerInventoryRole(actor);
    const { id } = await params;
    const body = (await req.json()) as Record<string, unknown>;
    const keys = Object.keys(body).filter((k) => body[k] !== undefined);
    const stockOnly =
      keys.includes("stock") &&
      keys.every((k) => ["stock", "stock_status", "stockStatus"].includes(k));
    if (stockOnly) {
      const data = await updateDealerInventoryStock(
        actor,
        id,
        Number(body.stock),
        body.stock_status != null ? String(body.stock_status) : body.stockStatus != null ? String(body.stockStatus) : undefined,
      );
      return ok({ data });
    }
    const data = await updateDealerInventoryItem(actor, id, body);
    return ok({ data });
  } catch (e) {
    return handleDealerInventoryError(e);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = inventoryActorFrom(req);
    requireDealerInventoryRole(actor);
    const { id } = await params;
    const data = await archiveDealerInventoryItem(actor, id);
    return ok({ data });
  } catch (e) {
    return handleDealerInventoryError(e);
  }
}
