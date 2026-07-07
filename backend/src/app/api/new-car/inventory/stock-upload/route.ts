import { NextRequest } from "next/server";
import { featureFlags } from "@/config/feature-flags";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth/middleware";
import { err, ok, unauthorized } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";

/** Daily stock sync — updates inventory row and writes audit log. */
export async function POST(req: NextRequest) {
  if (!featureFlags.newCarInventoryV2) return err("FEATURE_DISABLED", 404);

  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const body = (await req.json()) as Record<string, unknown>;
  const dealerId = String(body.dealer_id ?? body.dealerId ?? "");
  const inventoryId = String(body.inventory_id ?? body.inventoryId ?? "");
  const stockAfter = Number(body.stock_after ?? body.stockAfter);
  const fileName = body.file_name ? String(body.file_name) : body.fileName ? String(body.fileName) : null;
  const notes = body.notes ? String(body.notes) : null;

  if (!dealerId || !inventoryId || Number.isNaN(stockAfter) || stockAfter < 0) {
    return err("INVALID_PAYLOAD", 400);
  }

  const inv = await prisma.newCarInventory.findFirst({
    where: { id: inventoryId, dealerId },
  });
  if (!inv) return err("INVENTORY_NOT_FOUND", 404);

  const dealer = await prisma.dealer.findFirst({ where: { id: dealerId } });
  if (
    dealer?.ownerId !== auth.sub &&
    auth.role !== "super_admin" &&
    auth.role !== "admin"
  ) {
    return err("FORBIDDEN", 403);
  }

  const stockBefore = inv.stock;

  const [updated, log] = await prisma.$transaction([
    prisma.newCarInventory.update({
      where: { id: inventoryId },
      data: {
        stock: stockAfter,
        lastStockUpdateAt: new Date(),
      },
    }),
    prisma.newCarStockDailyLog.create({
      data: {
        dealerId,
        inventoryId,
        uploadedBy: auth.sub,
        fileName,
        stockBefore,
        stockAfter,
        notes,
      },
    }),
  ]);

  return ok({
    inventory: toSnakeRow(updated as unknown as Record<string, unknown>),
    log: toSnakeRow(log as unknown as Record<string, unknown>),
  });
}
