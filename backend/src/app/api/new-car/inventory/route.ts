import { NextRequest } from "next/server";
import { featureFlags } from "@/config/feature-flags";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth/middleware";
import { err, ok, unauthorized } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const dealerId = sp.get("dealer_id") ?? sp.get("dealerId");
  if (!dealerId) return err("DEALER_ID_REQUIRED", 400);

  const rows = await prisma.newCarInventory.findMany({
    where: { dealerId },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return ok({
    data: rows.map((r) => toSnakeRow(r as unknown as Record<string, unknown>)),
  });
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const body = (await req.json()) as Record<string, unknown>;
  const dealerId = String(body.dealer_id ?? body.dealerId ?? "");
  if (!dealerId) return err("DEALER_ID_REQUIRED", 400);

  const dealer = await prisma.dealer.findFirst({
    where: { id: dealerId, ownerId: auth.sub },
  });
  if (!dealer && auth.role !== "super_admin" && auth.role !== "admin") {
    return err("FORBIDDEN", 403);
  }

  const ex = Number(body.ex_showroom_price ?? body.exShowroomPrice ?? 0);
  if (!body.brand || !body.model || !ex || ex < 100000) {
    return err("INVALID_PAYLOAD", 400);
  }

  const v2 = featureFlags.newCarInventoryV2;
  const waiting =
    v2 && body.waiting_period_days != null
      ? Number(body.waiting_period_days)
      : v2 && body.waitingPeriodDays != null
        ? Number(body.waitingPeriodDays)
        : null;
  const offers = v2 ? (body.offers ?? []) : [];
  const brochureUrl = v2
    ? String(body.brochure_url ?? body.brochureUrl ?? "") || null
    : null;

  const row = await prisma.newCarInventory.create({
    data: {
      dealerId,
      brand: String(body.brand).trim(),
      model: String(body.model).trim(),
      variant: body.variant ? String(body.variant) : null,
      fuelType: String(body.fuel_type ?? body.fuelType ?? "Petrol"),
      transmission: String(body.transmission ?? "Manual"),
      exShowroomPrice: ex,
      onRoadPrice: Number(body.on_road_price ?? body.onRoadPrice ?? Math.round(ex * 1.12)),
      price: ex,
      stock: Number(body.stock ?? 1),
      stockStatus: String(body.stock_status ?? body.stockStatus ?? "available"),
      expectedDeliveryDays: Number(
        body.expected_delivery_days ?? body.expectedDeliveryDays ?? 14
      ),
      waitingPeriodDays: waiting ?? undefined,
      brochureUrl,
      offers: offers as object,
      imageUrl: body.image_url ? String(body.image_url) : body.imageUrl ? String(body.imageUrl) : null,
      lastStockUpdateAt: new Date(),
      year: Number(body.year ?? new Date().getFullYear()),
    },
  });

  return ok({ data: toSnakeRow(row as unknown as Record<string, unknown>) });
}
