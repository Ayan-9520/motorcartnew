import type { PrismaClient } from "@prisma/client";
import { INDIAN_CATALOG_CITIES } from "../data/indian-cities";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeFuel(fuel: string): string {
  return slugify(fuel.replace(/\s+/g, " ").trim());
}

function normalizeTransmission(transmission: string): string {
  return slugify(transmission.replace(/\s+/g, " ").trim());
}

/** Stable catalog business key — no timestamps. */
export function buildCatalogBusinessKey(input: {
  segment: string;
  brandSlug: string;
  modelSlug: string;
  variantSlug: string;
  fuelType: string;
  transmission: string;
  modelYear: number;
}): string {
  return [
    input.segment,
    input.brandSlug,
    input.modelSlug,
    input.variantSlug,
    normalizeFuel(input.fuelType),
    normalizeTransmission(input.transmission),
    String(input.modelYear),
  ].join("|");
}

const DATA_SOURCES = [
  { code: "manual", name: "Manual Entry", sourceType: "manual" as const },
  { code: "gaadi_bazaar", name: "GaadiBazaar", sourceType: "scrape" as const, baseUrl: "https://www.gaadibazaar.in" },
  { code: "cardekho", name: "CarDekho", sourceType: "scrape" as const, baseUrl: "https://www.cardekho.com" },
  { code: "oem_feed", name: "OEM Feed", sourceType: "oem_feed" as const },
  { code: "csv_upload", name: "CSV Upload", sourceType: "csv" as const },
  { code: "excel_upload", name: "Excel Upload", sourceType: "excel" as const },
  { code: "json_api", name: "JSON / API", sourceType: "json" as const },
] as const;

export async function seedCatalog(prisma: PrismaClient): Promise<void> {
  for (const city of INDIAN_CATALOG_CITIES) {
    await prisma.catalogCity.upsert({
      where: { slug: city.slug },
      update: {
        name: city.name,
        state: city.state,
        stateSlug: city.stateSlug,
        tier: city.tier,
        isActive: true,
      },
      create: {
        name: city.name,
        slug: city.slug,
        state: city.state,
        stateSlug: city.stateSlug,
        tier: city.tier,
        isActive: true,
      },
    });
  }

  for (const source of DATA_SOURCES) {
    await prisma.catalogDataSource.upsert({
      where: { code: source.code },
      update: {
        name: source.name,
        sourceType: source.sourceType,
        baseUrl: "baseUrl" in source ? source.baseUrl : null,
        isActive: true,
      },
      create: {
        code: source.code,
        name: source.name,
        sourceType: source.sourceType,
        baseUrl: "baseUrl" in source ? source.baseUrl : null,
        isActive: true,
        config: {},
      },
    });
  }

  const manualSource = await prisma.catalogDataSource.findUnique({ where: { code: "manual" } });
  const delhiCity = await prisma.catalogCity.findUnique({ where: { slug: "delhi-ncr" } });
  if (!manualSource || !delhiCity) return;

  const brandSlug = "hyundai";
  const modelSlug = "creta";
  const variantSlug = "sx-o-1-5-diesel-automatic";

  const brand = await prisma.catalogBrand.upsert({
    where: { slug: brandSlug },
    update: {
      name: "Hyundai",
      segment: "car",
      status: "published",
    },
    create: {
      name: "Hyundai",
      slug: brandSlug,
      segment: "car",
      country: "IN",
      status: "published",
      metadata: {},
    },
  });

  const model = await prisma.catalogModel.upsert({
    where: { brandId_slug: { brandId: brand.id, slug: modelSlug } },
    update: {
      name: "Creta",
      segment: "car",
      bodyType: "SUV",
      conditionScope: "all",
      launchYear: 2024,
      status: "published",
    },
    create: {
      brandId: brand.id,
      name: "Creta",
      slug: modelSlug,
      segment: "car",
      bodyType: "SUV",
      conditionScope: "all",
      launchYear: 2024,
      status: "published",
      metadata: {},
    },
  });

  const businessKey = buildCatalogBusinessKey({
    segment: "car",
    brandSlug,
    modelSlug,
    variantSlug,
    fuelType: "Diesel",
    transmission: "Automatic",
    modelYear: 2025,
  });

  const variant = await prisma.catalogVariant.upsert({
    where: { businessKey },
    update: {
      name: "SX(O) 1.5 Diesel Automatic",
      status: "published",
      exShowroomRef: 1899000,
      publishedAt: new Date(),
    },
    create: {
      modelId: model.id,
      name: "SX(O) 1.5 Diesel Automatic",
      slug: variantSlug,
      businessKey,
      fuelType: "Diesel",
      transmission: "Automatic",
      modelYear: 2025,
      conditionScope: "new",
      seating: 5,
      exShowroomRef: 1899000,
      status: "published",
      sourceId: manualSource.id,
      publishedAt: new Date(),
      metadata: {},
    },
  });

  await prisma.catalogVariantSpec.upsert({
    where: { variantId: variant.id },
    update: {
      engine: "1.5L U2 CRDi",
      displacement: "1493 cc",
      power: "115 bhp",
      torque: "250 Nm",
      mileage: "18.4 kmpl",
      seating: 5,
      bootSpace: "433 L",
      safety: ["6 Airbags", "ABS with EBD", "ESC", "HAC", "TPMS"],
      comfort: ["Ventilated Seats", "Panoramic Sunroof", "BOSE Audio", "Wireless Charger"],
    },
    create: {
      variantId: variant.id,
      engine: "1.5L U2 CRDi",
      displacement: "1493 cc",
      power: "115 bhp",
      torque: "250 Nm",
      mileage: "18.4 kmpl",
      seating: 5,
      bootSpace: "433 L",
      dimensions: { length: "4300 mm", width: "1790 mm", height: "1635 mm", wheelbase: "2610 mm" },
      safety: ["6 Airbags", "ABS with EBD", "ESC", "HAC", "TPMS"],
      comfort: ["Ventilated Seats", "Panoramic Sunroof", "BOSE Audio", "Wireless Charger"],
      extras: {},
    },
  });

  const existingMedia = await prisma.catalogVariantMedia.findFirst({
    where: { variantId: variant.id, mediaType: "image", isPrimary: true },
  });
  if (!existingMedia) {
    await prisma.catalogVariantMedia.create({
      data: {
        variantId: variant.id,
        mediaType: "image",
        url: "/media/vehicles/cars/Hyundai/Creta/01.webp",
        sortOrder: 0,
        isPrimary: true,
        altText: "Hyundai Creta",
        sourceId: manualSource.id,
      },
    });
  }

  const colorSeeds = [
    { name: "Atlas White", hexCode: "#F5F5F5", isDefault: true },
    { name: "Abyss Black", hexCode: "#1A1A1A", isDefault: false },
    { name: "Titan Grey", hexCode: "#6B7280", isDefault: false },
  ];
  for (const color of colorSeeds) {
    const existing = await prisma.catalogVariantColor.findFirst({
      where: { variantId: variant.id, name: color.name },
    });
    if (!existing) {
      await prisma.catalogVariantColor.create({
        data: { variantId: variant.id, ...color },
      });
    }
  }

  const featureSeeds = [
    { category: "safety", name: "6 Airbags" },
    { category: "safety", name: "ADAS Level 1" },
    { category: "comfort", name: "Ventilated Front Seats" },
    { category: "tech", name: "10.25-inch Touchscreen" },
    { category: "exterior", name: "LED DRLs" },
  ];
  for (const feature of featureSeeds) {
    const existing = await prisma.catalogVariantFeature.findFirst({
      where: { variantId: variant.id, category: feature.category, name: feature.name },
    });
    if (!existing) {
      await prisma.catalogVariantFeature.create({ data: { variantId: variant.id, ...feature } });
    }
  }

  const effectiveFrom = new Date("2025-01-01T00:00:00.000Z");
  await prisma.catalogVariantCityPrice.upsert({
    where: {
      variantId_cityId_effectiveFrom: {
        variantId: variant.id,
        cityId: delhiCity.id,
        effectiveFrom,
      },
    },
    update: {
      exShowroom: 1899000,
      onRoad: 2150000,
      rto: 95000,
      insurance: 85000,
    },
    create: {
      variantId: variant.id,
      cityId: delhiCity.id,
      exShowroom: 1899000,
      onRoad: 2150000,
      rto: 95000,
      insurance: 85000,
      effectiveFrom,
      sourceId: manualSource.id,
    },
  });

  console.log("  Catalog seed: cities, data sources, Hyundai Creta demo variant");
}

async function runStandalone(): Promise<void> {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    await seedCatalog(prisma);
    console.log("Catalog seed complete.");
  } finally {
    await prisma.$disconnect();
  }
}

const isDirectRun = process.argv[1]?.replace(/\\/g, "/").includes("catalog-seed");
if (isDirectRun) {
  runStandalone().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
