/**
 * Seed vehicles directly via Prisma (no API auth needed).
 * Run from backend: npx tsx scripts/seed-vehicles-catalog.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const samples = [
  { slug: "cars-hyundai-creta-2024", title: "Hyundai Creta 2024", brand: "Hyundai", model: "Creta", category: "cars", year: 2024, price: 1490000, city: "Mumbai", state: "Maharashtra", fuelType: "petrol", transmission: "automatic", bodyType: "suv", images: ["/media/vehicles/cars/Hyundai/Creta/01.webp"] },
  { slug: "bikes-royal-enfield-classic-350", title: "Royal Enfield Classic 350", brand: "Royal Enfield", model: "Classic 350", category: "bikes", year: 2023, price: 195000, city: "Delhi", state: "Delhi", fuelType: "petrol", transmission: "manual", bodyType: "motorcycle", images: ["/media/vehicles/bikes/Royal Enfield/Classic 350/01.webp"] },
  { slug: "trucks-tata-prima", title: "Tata Prima", brand: "Tata", model: "Prima", category: "trucks", year: 2022, price: 2850000, city: "Pune", state: "Maharashtra", fuelType: "diesel", transmission: "manual", bodyType: "truck", images: ["/media/vehicles/trucks/Tata/Prima/01.webp"] },
  { slug: "used-cars-maruti-swift", title: "Maruti Swift VXI", brand: "Maruti", model: "Swift", category: "used-cars", year: 2021, price: 650000, city: "Bangalore", state: "Karnataka", fuelType: "petrol", transmission: "manual", bodyType: "hatchback", images: ["/media/vehicles/cars/Maruti/Swift/01.webp"] },
];

async function main() {
  for (const v of samples) {
    await prisma.vehicle.upsert({
      where: { slug: v.slug },
      update: {},
      create: {
        slug: v.slug,
        title: v.title,
        brand: v.brand,
        model: v.model,
        category: v.category,
        year: v.year,
        price: v.price,
        city: v.city,
        state: v.state,
        fuelType: v.fuelType,
        transmission: v.transmission,
        bodyType: v.bodyType,
        images: v.images,
        status: "available",
        condition: v.category.includes("used") ? "used" : "new",
      },
    });
  }
  console.log(`Seeded ${samples.length} vehicles`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
