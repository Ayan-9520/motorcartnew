import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth/middleware";
import { err, ok, unauthorized } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";

async function assertDealerAccess(dealerId: string, authSub: string, role: string) {
  if (role === "super_admin" || role === "admin") return true;
  const dealer = await prisma.dealer.findFirst({
    where: { id: dealerId, ownerId: authSub, deletedAt: null },
  });
  return Boolean(dealer);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const { id } = await params;
  const body = (await req.json()) as Record<string, unknown>;

  const existing = await prisma.newCarInventory.findUnique({ where: { id } });
  if (!existing) return err("NOT_FOUND", 404);

  const allowed = await assertDealerAccess(existing.dealerId, auth.sub, auth.role);
  if (!allowed) return err("FORBIDDEN", 403);

  const row = await prisma.newCarInventory.update({
    where: { id },
    data: {
      brand: body.brand != null ? String(body.brand) : undefined,
      model: body.model != null ? String(body.model) : undefined,
      variant: body.variant != null ? String(body.variant) : undefined,
      fuelType: body.fuel_type != null ? String(body.fuel_type) : body.fuelType != null ? String(body.fuelType) : undefined,
      transmission: body.transmission != null ? String(body.transmission) : undefined,
      exShowroomPrice:
        body.ex_showroom_price != null
          ? Number(body.ex_showroom_price)
          : body.exShowroomPrice != null
            ? Number(body.exShowroomPrice)
            : undefined,
      onRoadPrice:
        body.on_road_price != null
          ? Number(body.on_road_price)
          : body.onRoadPrice != null
            ? Number(body.onRoadPrice)
            : undefined,
      stockStatus:
        body.stock_status != null ? String(body.stock_status) : body.stockStatus != null ? String(body.stockStatus) : undefined,
      imageUrl: body.image_url != null ? String(body.image_url) : body.imageUrl != null ? String(body.imageUrl) : undefined,
      expectedDeliveryDays:
        body.expected_delivery_days != null
          ? Number(body.expected_delivery_days)
          : body.expectedDeliveryDays != null
            ? Number(body.expectedDeliveryDays)
            : undefined,
    },
  });

  return ok({ data: toSnakeRow(row as unknown as Record<string, unknown>) });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthUser(_req);
  if (!auth) return unauthorized();

  const { id } = await params;
  const existing = await prisma.newCarInventory.findUnique({ where: { id } });
  if (!existing) return err("NOT_FOUND", 404);

  const allowed = await assertDealerAccess(existing.dealerId, auth.sub, auth.role);
  if (!allowed) return err("FORBIDDEN", 403);

  await prisma.newCarInventory.delete({ where: { id } });
  return ok({ data: { id } });
}
