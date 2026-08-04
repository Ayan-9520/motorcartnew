import { toSnakeRow } from "@/lib/db/table-map";
import type { Dealer, Vehicle, VehicleSpec } from "@prisma/client";

export type VehicleWithRelations = Vehicle & {
  dealer?: Partial<Dealer> | null;
  specs?: VehicleSpec | null;
};

/** Serialize vehicle row for API responses (snake_case, JSON-safe). */
export function serializeVehicle(v: VehicleWithRelations): Record<string, unknown> {
  const { dealer, specs, ...rest } = v;
  const row = toSnakeRow(rest as unknown as Record<string, unknown>);
  if (dealer) {
    row.dealer = toSnakeRow(dealer as unknown as Record<string, unknown>);
  }
  if (specs) {
    row.specs = toSnakeRow(specs as unknown as Record<string, unknown>);
  }
  return row;
}
