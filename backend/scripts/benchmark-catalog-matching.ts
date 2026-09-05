/**
 * Benchmark: 100,000 catalog match lookups (in-memory index, no DB).
 * Run: npm run benchmark:catalog-matching
 */
import { buildCatalogBusinessKey } from "../src/lib/catalog/business-key";
import { createCatalogMatchingService } from "../src/lib/catalog/catalog-matching.service";
import type { CatalogMatchInput, CatalogVariantRecord } from "../src/lib/catalog/types";

const VARIANT_COUNT = 10_000;
const LOOKUP_COUNT = 100_000;

function buildSyntheticCatalog(count: number): CatalogVariantRecord[] {
  const brands = ["hyundai", "maruti", "tata", "mahindra", "toyota", "honda", "kia", "mg"];
  const models = ["creta", "swift", "nexon", "xuv700", "fortuner", "city", "seltos", "hector"];
  const fuels = ["petrol", "diesel", "petrol+cng", "electric"];
  const transmissions = ["mt", "at"];
  const variants: CatalogVariantRecord[] = [];

  for (let i = 0; i < count; i++) {
    const brandSlug = brands[i % brands.length]!;
    const modelSlug = models[i % models.length]!;
    const variantSlug = `variant-${i}`;
    const fuelType = fuels[i % fuels.length]!;
    const transmission = transmissions[i % transmissions.length]!;
    const modelYear = 2020 + (i % 6);
    const businessKey = buildCatalogBusinessKey({
      segment: "car",
      brandSlug,
      modelSlug,
      variantSlug,
      fuelType,
      transmission,
      modelYear,
    });
    variants.push({
      id: `syn-${i}`,
      segment: "car",
      brandSlug,
      brandName: brandSlug,
      modelSlug,
      modelName: modelSlug,
      variantSlug,
      variantName: variantSlug,
      fuelType,
      transmission,
      modelYear,
      businessKey,
    });
  }
  return variants;
}

function buildLookupPool(catalog: CatalogVariantRecord[]): CatalogMatchInput[] {
  const pool: CatalogMatchInput[] = [];
  for (let i = 0; i < LOOKUP_COUNT; i++) {
    const v = catalog[i % catalog.length]!;
    // Mix exact and normalized-style labels
    if (i % 3 === 0) {
      pool.push({
        segment: "car",
        brand: v.brandName,
        model: v.modelName,
        variant: v.variantName,
        fuel: v.fuelType,
        transmission: v.transmission,
        modelYear: v.modelYear,
      });
    } else if (i % 3 === 1) {
      pool.push({
        segment: "car",
        brand: v.brandSlug === "maruti" ? "Maruti Suzuki" : v.brandName,
        model: v.modelName,
        variant: v.variantName.replace(/-/g, " "),
        fuel: v.fuelType === "petrol+cng" ? "Petrol + CNG" : v.fuelType,
        transmission: v.transmission === "at" ? "Automatic" : "Manual",
        modelYear: v.modelYear,
      });
    } else {
      pool.push({
        segment: "car",
        brand: "Nonexistent",
        model: "Unknown",
        variant: `missing-${i}`,
        fuel: "Petrol",
        transmission: "Manual",
        modelYear: 2010,
      });
    }
  }
  return pool;
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)] ?? 0;
}

async function main() {
  console.log("Building synthetic catalog index…");
  const catalog = buildSyntheticCatalog(VARIANT_COUNT);
  const service = createCatalogMatchingService(catalog);
  const lookups = buildLookupPool(catalog);

  // Warmup
  for (let i = 0; i < 1000; i++) {
    service.match(lookups[i % lookups.length]!);
  }

  const durationsNs: number[] = [];
  let matched = 0;

  console.log(`Running ${LOOKUP_COUNT.toLocaleString()} lookups…`);
  const start = process.hrtime.bigint();

  for (const input of lookups) {
    const t0 = process.hrtime.bigint();
    const r = service.match(input);
    const t1 = process.hrtime.bigint();
    durationsNs.push(Number(t1 - t0));
    if (r.catalogVariantId) matched++;
  }

  const totalNs = Number(process.hrtime.bigint() - start);
  durationsNs.sort((a, b) => a - b);

  const avgMs = totalNs / LOOKUP_COUNT / 1_000_000;
  const maxMs = (durationsNs[durationsNs.length - 1] ?? 0) / 1_000_000;
  const p50Ms = percentile(durationsNs, 50) / 1_000_000;
  const p95Ms = percentile(durationsNs, 95) / 1_000_000;
  const p99Ms = percentile(durationsNs, 99) / 1_000_000;

  console.log("\n=== Catalog Matching Benchmark ===");
  console.log(`Catalog variants : ${VARIANT_COUNT.toLocaleString()}`);
  console.log(`Lookups          : ${LOOKUP_COUNT.toLocaleString()}`);
  console.log(`Matched          : ${matched.toLocaleString()} (${((matched / LOOKUP_COUNT) * 100).toFixed(1)}%)`);
  console.log(`Total time       : ${(totalNs / 1_000_000).toFixed(1)} ms`);
  console.log(`Throughput       : ${Math.round(LOOKUP_COUNT / (totalNs / 1_000_000_000)).toLocaleString()} lookups/sec`);
  console.log(`Average lookup   : ${avgMs.toFixed(4)} ms`);
  console.log(`Median (p50)     : ${p50Ms.toFixed(4)} ms`);
  console.log(`p95              : ${p95Ms.toFixed(4)} ms`);
  console.log(`p99              : ${p99Ms.toFixed(4)} ms`);
  console.log(`Maximum lookup   : ${maxMs.toFixed(4)} ms`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
