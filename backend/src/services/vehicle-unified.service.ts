import { prisma } from "@/lib/prisma";
import { toSnakeRow } from "@/lib/db/table-map";

export type UnifiedVehicleResponse = {
  vehicle: Record<string, unknown>;
  dealer: Record<string, unknown> | null;
  specs: Record<string, unknown> | null;
};

export async function fetchVehicleWithDealerBySlug(
  slug: string
): Promise<UnifiedVehicleResponse | null> {
  const vehicle = await prisma.vehicle.findFirst({
    where: { slug, deletedAt: null },
    include: {
      dealer: true,
      specs: true,
    },
  });

  if (!vehicle) return null;

  const vehicleRow = toSnakeRow(vehicle as unknown as Record<string, unknown>);
  delete vehicleRow.dealer;
  delete vehicleRow.specs;

  const dealer = vehicle.dealer
    ? toSnakeRow(vehicle.dealer as unknown as Record<string, unknown>)
    : null;
  const specs = vehicle.specs
    ? toSnakeRow(vehicle.specs as unknown as Record<string, unknown>)
    : null;

  return { vehicle: vehicleRow, dealer, specs };
}
