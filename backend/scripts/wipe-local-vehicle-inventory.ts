import { prisma } from "@/lib/prisma";

async function main() {
  const before = {
    vehicles: await prisma.vehicle.count(),
    newCarInventory: await prisma.newCarInventory.count(),
  };
  await prisma.quotation.updateMany({ where: { inventoryId: { not: null } }, data: { inventoryId: null } });
  await prisma.testDriveBooking.deleteMany({});
  await prisma.lead.updateMany({ where: { vehicleId: { not: null } }, data: { vehicleId: null } });
  await prisma.wishlist.deleteMany({});
  await prisma.vehicleSpec.deleteMany({});
  const inv = await prisma.newCarInventory.deleteMany({});
  const veh = await prisma.vehicle.deleteMany({});
  console.log(
    JSON.stringify(
      {
        before,
        deleted: { vehicles: veh.count, newCarInventory: inv.count },
        after: {
          vehicles: await prisma.vehicle.count(),
          newCarInventory: await prisma.newCarInventory.count(),
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
