import { NextRequest } from "next/server";
import { featureFlags } from "@/config/feature-flags";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth/middleware";
import { err, ok, unauthorized } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  if (!featureFlags.wishlistDb) return err("FEATURE_DISABLED", 404);

  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const rows = await prisma.wishlist.findMany({
    where: { userId: auth.sub },
    include: { vehicle: { include: { dealer: true } } },
    orderBy: { createdAt: "desc" },
  });

  return ok({
    data: rows.map((w) => ({
      ...toSnakeRow(w as unknown as Record<string, unknown>),
      vehicle: w.vehicle
        ? toSnakeRow(w.vehicle as unknown as Record<string, unknown>)
        : null,
      dealer: w.vehicle?.dealer
        ? toSnakeRow(w.vehicle.dealer as unknown as Record<string, unknown>)
        : null,
    })),
    vehicleIds: rows.map((w) => w.vehicleId),
  });
}

export async function POST(req: NextRequest) {
  if (!featureFlags.wishlistDb) return err("FEATURE_DISABLED", 404);

  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const body = (await req.json()) as { vehicle_id?: string; vehicleId?: string };
  const vehicleId = body.vehicle_id ?? body.vehicleId;
  if (!vehicleId || !UUID_RE.test(vehicleId)) return err("INVALID_VEHICLE_ID", 400);

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, deletedAt: null },
  });
  if (!vehicle) return err("VEHICLE_NOT_FOUND", 404);

  await prisma.wishlist.upsert({
    where: { userId_vehicleId: { userId: auth.sub, vehicleId } },
    create: { userId: auth.sub, vehicleId },
    update: {},
  });

  return ok({ vehicleId });
}

export async function DELETE(req: NextRequest) {
  if (!featureFlags.wishlistDb) return err("FEATURE_DISABLED", 404);

  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const vehicleId =
    req.nextUrl.searchParams.get("vehicle_id") ??
    req.nextUrl.searchParams.get("vehicleId");
  if (!vehicleId || !UUID_RE.test(vehicleId)) return err("INVALID_VEHICLE_ID", 400);

  await prisma.wishlist.deleteMany({
    where: { userId: auth.sub, vehicleId },
  });

  return ok({ removed: true });
}
