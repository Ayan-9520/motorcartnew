/**
 * Bulk seed new-car inventory from Motorcart CSV template (Prisma — no UI needed).
 * Run: cd backend && npx tsx scripts/seed-new-cars-bulk.ts
 * Docker DB: DATABASE_URL=postgresql://motorcart:strongpassword@localhost:5432/motorcart npx tsx scripts/seed-new-cars-bulk.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Unsplash images matched by body style — realistic per segment */
const IMAGES = {
  compactSuv: "https://images.unsplash.com/photo-1621007947412-bf9849fb4dbb?w=1200&q=80",
  midSuv: "https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=1200&q=80",
  largeSuv: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=1200&q=80",
  crossover: "https://images.unsplash.com/photo-1619767886555-ef069784966e?w=1200&q=80",
  hatchback: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=1200&q=80",
  sedan: "https://images.unsplash.com/photo-1552519507-da3b1422066f?w=1200&q=80",
  ev: "https://images.unsplash.com/photo-1593941707882-a5bba14938ce?w=1200&q=80",
  evCompact: "https://images.unsplash.com/photo-1560958089-b8a5a4169fbf?w=1200&q=80",
  mpv: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db0?w=1200&q=80",
  offroad: "https://images.unsplash.com/photo-1519003726064-ed958342314c?w=1200&q=80",
  premiumSuv: "https://images.unsplash.com/photo-1533474712520-0195c1f15ce9?w=1200&q=80",
} as const;

/** Per model image — brand|model → best-matching Unsplash */
const MODEL_IMAGE: Record<string, string> = {
  "Hyundai|Creta": IMAGES.midSuv,
  "Hyundai|Venue": IMAGES.compactSuv,
  "Hyundai|Exter": IMAGES.crossover,
  "Hyundai|Alcazar": IMAGES.largeSuv,
  "Tata|Nexon": IMAGES.crossover,
  "Tata|Punch": IMAGES.compactSuv,
  "Tata|Harrier": IMAGES.largeSuv,
  "Tata|Nexon EV": IMAGES.ev,
  "Tata|Tiago EV": IMAGES.evCompact,
  "Maruti|Suzuki Swift": IMAGES.hatchback,
  "Maruti|Suzuki Brezza": IMAGES.compactSuv,
  "Maruti|Suzuki Grand Vitara": IMAGES.midSuv,
  "Maruti|Suzuki Fronx": IMAGES.crossover,
  "Mahindra|Scorpio N": IMAGES.largeSuv,
  "Mahindra|XUV700": IMAGES.premiumSuv,
  "Mahindra|Thar": IMAGES.offroad,
  "Mahindra|XUV400 EV": IMAGES.ev,
  "Kia|Seltos": IMAGES.midSuv,
  "Kia|Sonet": IMAGES.compactSuv,
  "Kia|Carens": IMAGES.mpv,
  "Toyota|Innova Crysta": IMAGES.mpv,
  "Toyota|Fortuner": IMAGES.premiumSuv,
  "Toyota|Hyryder": IMAGES.midSuv,
  "Honda|City": IMAGES.sedan,
  "Honda|Elevate": IMAGES.compactSuv,
  "MG|Hector": IMAGES.largeSuv,
  "MG|Comet EV": IMAGES.evCompact,
  "Skoda|Kushaq": IMAGES.midSuv,
  "Volkswagen|Virtus": IMAGES.sedan,
  "Jeep|Compass": IMAGES.offroad,
};

type CsvRow = {
  brand: string;
  model: string;
  variant: string;
  year: number;
  fuel: string;
  transmission: string;
  kms: number;
  owners: number;
  price: number;
  color: string;
  state: string;
  description: string;
  dealerPrice: number;
  discount: number;
};

function slugify(parts: string[]) {
  return parts
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function bodyTypeFor(brand: string, model: string, fuel: string): string {
  const key = `${brand}|${model}`;
  if (model.includes("EV") || fuel.toLowerCase() === "electric") return "ev";
  if (/Swift|Tiago|Comet|Virtus|City/i.test(model)) return model.includes("City") || model.includes("Virtus") ? "sedan" : "hatchback";
  if (/Innova|Carens/i.test(model)) return "mpv";
  if (/Thar|Compass|Fortuner|Harrier|XUV700|Scorpio/i.test(model)) return "suv";
  if (/Venue|Sonet|Punch|Brezza|Exter|Fronx|Elevate/i.test(model)) return "compact-suv";
  return "suv";
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/);
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;
    const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((c) => c.replace(/^"|"$/g, "").trim());
    if (cols.length < 15) continue;
    rows.push({
      brand: cols[0],
      model: cols[1],
      variant: cols[2],
      year: Number(cols[3]),
      fuel: cols[4],
      transmission: cols[5],
      kms: Number(cols[6]),
      owners: Number(cols[7]),
      price: Number(cols[8]),
      color: cols[9],
      state: cols[10],
      description: cols[11],
      dealerPrice: Number(cols[12]),
      discount: Number(cols[13]),
    });
  }
  return rows;
}

function imageFor(brand: string, model: string, fuel: string): string {
  return MODEL_IMAGE[`${brand}|${model}`] ?? (fuel.toLowerCase() === "electric" ? IMAGES.ev : IMAGES.midSuv);
}

async function main() {
  const dealerEmail = process.env.DEALER_EMAIL?.trim() || "newcar@gmail.com";
  const csvPath = join(__dirname, "..", "..", "scripts", "templates", "motorcart-new-cars-full.csv");
  const csv = readFileSync(csvPath, "utf-8");
  const rows = parseCsv(csv);
  if (!rows.length) throw new Error("No rows in CSV");

  const dealerUser = await prisma.user.findFirst({ where: { email: dealerEmail } });
  if (!dealerUser) throw new Error(`${dealerEmail} not found — run db:seed or sign up first`);

  let dealer = await prisma.dealer.findFirst({ where: { ownerId: dealerUser.id } });
  if (!dealer) throw new Error(`No dealer profile for ${dealerEmail}`);

  await prisma.dealer.update({
    where: { id: dealer.id },
    data: { dealerType: "new_car_dealer" },
  });

  // Clear prior new-car rows for this dealer only
  await prisma.newCarInventory.deleteMany({ where: { dealerId: dealer.id } });
  await prisma.vehicle.deleteMany({ where: { dealerId: dealer.id, category: "new-cars" } });

  let created = 0;

  for (const row of rows) {
    const title = `${row.year} ${row.brand} ${row.model}${row.variant ? ` ${row.variant}` : ""}`.trim();
    const slug = slugify(["new-cars", dealer.slug, row.brand, row.model, String(row.year)]);
    const img = imageFor(row.brand, row.model, row.fuel);
    const finalPrice = row.dealerPrice || row.price;
    const exShowroom = row.price;

    await prisma.vehicle.create({
      data: {
        dealerId: dealer.id,
        sellerId: dealerUser.id,
        slug,
        title,
        brand: row.brand,
        model: row.model,
        variant: row.variant || null,
        year: row.year,
        price: finalPrice,
        originalPrice: row.discount > 0 ? exShowroom : null,
        fuelType: row.fuel.toLowerCase(),
        transmission: row.transmission.toLowerCase().includes("auto") ? "automatic" : "manual",
        bodyType: bodyTypeFor(row.brand, row.model, row.fuel),
        category: "new-cars",
        kmsDriven: row.kms,
        owners: row.owners,
        color: row.color,
        city: dealer.city,
        state: row.state,
        description: row.description,
        images: [img],
        status: "available",
        condition: "new",
        isFeatured: created < 6,
        metadata: {
          discountPercent: row.discount,
          importSource: "bulk_csv_seed",
          imageSource: "unsplash",
        },
      },
    });

    await prisma.newCarInventory.create({
      data: {
        dealerId: dealer.id,
        brand: row.brand,
        model: row.model,
        variant: row.variant || "Standard",
        year: row.year,
        fuelType: row.fuel.toLowerCase(),
        transmission: row.transmission,
        exShowroomPrice: exShowroom,
        onRoadPrice: finalPrice,
        discountAmount: row.discount > 0 ? exShowroom - finalPrice : 0,
        price: finalPrice,
        stockStatus: "available",
        stockHealth: "fast_moving",
        colors: [row.color],
        imageUrl: img,
        expectedDeliveryDays: 14,
        stock: 1,
      },
    });

    created++;
  }

  await prisma.inventoryUpload.create({
    data: {
      dealerId: dealer.id,
      uploadedBy: dealerUser.id,
      fileUrl: "bulk://scripts/templates/motorcart-new-cars-full.csv",
      fileName: "motorcart-new-cars-full.csv",
      totalRows: rows.length,
      successRows: rows.length,
      failedRows: 0,
      status: "completed",
      completedAt: new Date(),
    },
  });

  console.log(`New cars seeded: ${created} vehicles + showroom rows for ${dealerEmail}`);
  console.log(`Dealer: ${dealer.name} (${dealer.slug}) → new_car_dealer`);
  console.log(`Showroom: http://localhost:3000/dashboard/new-car/inventory`);
  console.log(`Website: http://localhost:3000/buy/cars/new`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
