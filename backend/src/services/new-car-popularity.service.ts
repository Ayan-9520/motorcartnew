import { prisma } from "@/lib/prisma";

export type PopularModelScore = {
  brand: string;
  model: string;
  score: number;
  leads: number;
  wishlists: number;
  quotations: number;
  testDrives: number;
};

const WINDOW_DAYS = 120;
const CACHE_MS = 10 * 60 * 1000;
const WEIGHTS = { leads: 3, wishlists: 1, quotations: 4, testDrives: 5 } as const;

let cache: { at: number; data: PopularModelScore[] } | null = null;

function key(brand: string, model: string) {
  return `${brand.trim().toLowerCase()}|${model.trim().toLowerCase()}`;
}

/**
 * Real buyer demand per brand+model over the last 120 days:
 * enquiries/leads, wishlists, quotations and test drives on new-car stock.
 */
export async function getPopularNewCarModels(limit = 50): Promise<PopularModelScore[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data.slice(0, limit);

  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const [leads, wishlists, quotations, testDrives] = await Promise.all([
    prisma.lead.findMany({ where: { createdAt: { gte: since }, vehicleId: { not: null } }, select: { vehicleId: true }, take: 20000 }),
    prisma.wishlist.findMany({ where: { createdAt: { gte: since } }, select: { vehicleId: true }, take: 20000 }),
    prisma.quotation.findMany({
      where: { createdAt: { gte: since } },
      select: { vehicleId: true, inventoryId: true },
      take: 20000,
    }),
    prisma.testDriveBooking.findMany({
      where: { createdAt: { gte: since } },
      select: { vehicleId: true, inventoryId: true },
      take: 20000,
    }),
  ]);

  const vehicleIds = new Set<string>();
  const inventoryIds = new Set<string>();
  for (const r of leads) if (r.vehicleId) vehicleIds.add(r.vehicleId);
  for (const r of wishlists) vehicleIds.add(r.vehicleId);
  for (const r of [...quotations, ...testDrives]) {
    if (r.vehicleId) vehicleIds.add(r.vehicleId);
    if (r.inventoryId) inventoryIds.add(r.inventoryId);
  }

  const [vehicles, inventory] = await Promise.all([
    vehicleIds.size
      ? prisma.vehicle.findMany({
          where: { id: { in: [...vehicleIds] }, category: { notIn: ["bikes", "trucks", "buses"] } },
          select: { id: true, brand: true, model: true },
        })
      : [],
    inventoryIds.size
      ? prisma.newCarInventory.findMany({ where: { id: { in: [...inventoryIds] } }, select: { id: true, brand: true, model: true } })
      : [],
  ]);
  const byVehicle = new Map(vehicles.map((v) => [v.id, v]));
  const byInventory = new Map(inventory.map((v) => [v.id, v]));

  const scores = new Map<string, PopularModelScore>();
  const bump = (ref: { brand: string; model: string } | undefined, field: keyof typeof WEIGHTS) => {
    if (!ref?.brand?.trim() || !ref.model?.trim()) return;
    const k = key(ref.brand, ref.model);
    const row =
      scores.get(k) ??
      { brand: ref.brand.trim(), model: ref.model.trim(), score: 0, leads: 0, wishlists: 0, quotations: 0, testDrives: 0 };
    row[field] += 1;
    row.score += WEIGHTS[field];
    scores.set(k, row);
  };

  for (const r of leads) bump(r.vehicleId ? byVehicle.get(r.vehicleId) : undefined, "leads");
  for (const r of wishlists) bump(byVehicle.get(r.vehicleId), "wishlists");
  for (const r of quotations) bump((r.inventoryId && byInventory.get(r.inventoryId)) || (r.vehicleId ? byVehicle.get(r.vehicleId) : undefined), "quotations");
  for (const r of testDrives) bump((r.inventoryId && byInventory.get(r.inventoryId)) || (r.vehicleId ? byVehicle.get(r.vehicleId) : undefined), "testDrives");

  const data = [...scores.values()].sort((a, b) => b.score - a.score);
  cache = { at: Date.now(), data };
  return data.slice(0, limit);
}
