/**
 * Benchmark: catalog approval review (in-memory, no DB).
 * Run: npm run benchmark:catalog-approval
 */
import { buildCatalogBusinessKey } from "../src/lib/catalog/business-key";
import { createCatalogMatchingService } from "../src/lib/catalog/catalog-matching.service";
import { createCatalogLinkingService } from "../src/lib/catalog/catalog-linking.service";
import { createCatalogApprovalService } from "../src/lib/catalog/catalog-approval.service";
import type { CatalogVariantRecord } from "../src/lib/catalog/types";
import type { ListingApprovalContext } from "../src/lib/catalog/approval-types";
import type { ListingRecord } from "../src/lib/catalog/linking-types";

const VARIANT_COUNT = 10_000;
const LISTING_COUNT = 5_000;

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
      businessKey: buildCatalogBusinessKey({
        segment: "car",
        brandSlug,
        modelSlug,
        variantSlug,
        fuelType,
        transmission,
        modelYear,
      }),
    });
  }
  return variants;
}

function buildSyntheticListings(count: number, catalog: CatalogVariantRecord[]): ListingRecord[] {
  const listings: ListingRecord[] = [];
  for (let i = 0; i < count; i++) {
    const v = catalog[i % catalog.length]!;
    listings.push({
      id: `listing-${i}`,
      source: i % 2 === 0 ? "vehicles" : "new_car_inventory",
      brand: i % 3 === 1 ? "Maruti Suzuki" : v.brandName,
      model: v.modelName,
      variant: v.variantName,
      fuel: v.fuelType === "petrol+cng" ? "Petrol + CNG" : v.fuelType,
      transmission: v.transmission === "at" ? "Automatic" : "Manual",
      modelYear: v.modelYear,
      category: "cars",
    });
  }
  return listings;
}

function buildContext(listings: ListingRecord[]): ListingApprovalContext[] {
  const cities = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Pune"];
  return listings.map((l, i) => ({
    listingId: l.id,
    dealerId: `dealer-${i % 50}`,
    dealerName: `Dealer ${i % 50}`,
    city: cities[i % cities.length] ?? "Mumbai",
    fuel: l.fuel,
    transmission: l.transmission,
  }));
}

async function main() {
  console.log("Building synthetic catalog + listings…");
  const catalog = buildSyntheticCatalog(VARIANT_COUNT);
  const listings = buildSyntheticListings(LISTING_COUNT, catalog);
  const context = buildContext(listings);

  const linker = createCatalogLinkingService(createCatalogMatchingService(catalog));
  const approval = createCatalogApprovalService(catalog);

  linker.buildReport(listings.slice(0, 100));
  approval.review({ linkReport: linker.buildReport(listings.slice(0, 100)), listingContext: context.slice(0, 100) });

  const start = process.hrtime.bigint();
  const linkReport = linker.buildReport(listings);
  const report = approval.review({ linkReport, listingContext: context });
  const totalNs = Number(process.hrtime.bigint() - start);

  console.log("\n=== Catalog Approval Benchmark (dry run, in-memory) ===");
  console.log(`Catalog variants : ${VARIANT_COUNT.toLocaleString()}`);
  console.log(`Listings reviewed: ${LISTING_COUNT.toLocaleString()}`);
  console.log(`Total time       : ${(totalNs / 1_000_000).toFixed(1)} ms`);
  console.log(`Throughput       : ${Math.round(LISTING_COUNT / (totalNs / 1_000_000_000)).toLocaleString()} listings/sec`);
  console.log(`Average listing  : ${(totalNs / LISTING_COUNT / 1_000_000).toFixed(4)} ms`);
  console.log("");
  console.log(`Auto approved    : ${report.summary.autoApproved}`);
  console.log(`Manual review    : ${report.summary.manualReview}`);
  console.log(`Rejected         : ${report.summary.rejected}`);
  console.log(`Recommendations  : ${report.summary.recommendationCount}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
