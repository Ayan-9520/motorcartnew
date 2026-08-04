import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { featureFlags } from "@/config/feature-flags";
import { ok, err } from "@/lib/api-response";
import { serializeVehicle } from "@/lib/serialize-vehicle";

/** Vehicle detail by UUID or slug with dealer join. */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!featureFlags.unifiedVehicleApi) {
    return err("FEATURE_DISABLED", 404);
  }

  const { id } = await ctx.params;
  if (!id?.trim()) return err("INVALID_ID", 400);

  const key = id.trim();
  const vehicle = await prisma.vehicle.findFirst({
    where: {
      deletedAt: null,
      OR: [{ id: key }, { slug: key }],
    },
    include: {
      dealer: { select: { id: true, slug: true, name: true, city: true, phone: true, isVerified: true } },
      specs: true,
    },
  });

  if (!vehicle) return err("Vehicle not found", 404);

  return ok({ data: serializeVehicle(vehicle) });
}
