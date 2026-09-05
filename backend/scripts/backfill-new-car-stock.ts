/**
 * Backfill: Excel CRM uploads often land as vehicles(condition=new, category=used-cars)
 * without NewCarInventory rows. Publish them to public /buy/cars/new stock.
 */
import { prisma } from "../src/lib/prisma";

async function main() {
  const vehicles = await prisma.vehicle.findMany({
    where: {
      status: "available",
      OR: [{ condition: "new" }, { category: "new-cars" }],
    },
  });

  let updated = 0;
  let createdInv = 0;
  let skipped = 0;

  for (const v of vehicles) {
    if (v.category !== "new-cars" || v.condition !== "new") {
      await prisma.vehicle.update({
        where: { id: v.id },
        data: { category: "new-cars", condition: "new" },
      });
      updated += 1;
    }

    if (!v.dealerId) {
      skipped += 1;
      continue;
    }

    const existing = await prisma.newCarInventory.findFirst({
      where: {
        dealerId: v.dealerId,
        brand: v.brand,
        model: v.model,
        variant: v.variant ?? null,
      },
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    const price = Number(v.price);
    const ex = v.originalPrice != null ? Number(v.originalPrice) : price;
    const imageUrl =
      Array.isArray(v.images) && v.images[0] && String(v.images[0]).startsWith("http")
        ? String(v.images[0])
        : null;

    await prisma.newCarInventory.create({
      data: {
        dealerId: v.dealerId,
        brand: v.brand,
        model: v.model,
        variant: v.variant,
        year: v.year,
        fuelType: v.fuelType || null,
        transmission: v.transmission || null,
        exShowroomPrice: ex > 0 ? ex : 0,
        onRoadPrice: null,
        price: price > 0 ? price : null,
        stock: 1,
        stockStatus: "available",
        colors: v.color ? [v.color] : [],
        imageUrl,
        metadata: {
          vehicle_id: v.id,
          import_source: "backfill_from_vehicles",
          ...(price <= 0 ? { price_on_request: true } : {}),
        },
        lastStockUpdateAt: new Date(),
      },
    });
    createdInv += 1;
  }

  console.log(
    JSON.stringify(
      {
        vehiclesFound: vehicles.length,
        categoryFixed: updated,
        inventoryCreated: createdInv,
        skipped,
        after: {
          newCarInventory: await prisma.newCarInventory.count(),
          newVehicles: await prisma.vehicle.count({
            where: { OR: [{ condition: "new" }, { category: "new-cars" }] },
          }),
        },
      },
      null,
      2,
    ),
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
