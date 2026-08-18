import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createCatalogMatchingService } from "./catalog-matching.service";
import { catalogVariantRecordFromParts } from "./catalog-linking.loader";
import { createCatalogLinkingService } from "./catalog-linking.service";
import {
  catalogLinkReportToCsv,
  catalogLinkReportToJson,
  formatSummaryText,
} from "./linking-report";
import { inferSegmentFromCategory } from "./segment-inference";
import { listingToMatchInput, vehicleRowToListing } from "./listing-mapper";
import type { CatalogVariantRecord } from "./types";
import type { ListingRecord } from "./linking-types";

function variant(partial: Omit<CatalogVariantRecord, "businessKey"> & { businessKey?: string }): CatalogVariantRecord {
  return catalogVariantRecordFromParts(partial);
}

const CATALOG: CatalogVariantRecord[] = [
  variant({
    id: "cat-creta",
    segment: "car",
    brandSlug: "hyundai",
    brandName: "Hyundai",
    modelSlug: "creta",
    modelName: "Creta",
    variantSlug: "sx-o-1-5-diesel-automatic",
    variantName: "SX(O) 1.5 Diesel Automatic",
    fuelType: "diesel",
    transmission: "at",
    modelYear: 2025,
  }),
  variant({
    id: "cat-swift",
    segment: "car",
    brandSlug: "maruti",
    brandName: "Maruti",
    modelSlug: "swift",
    modelName: "Swift",
    variantSlug: "vxi",
    variantName: "VXI",
    fuelType: "petrol",
    transmission: "mt",
    modelYear: 2025,
  }),
  variant({
    id: "cat-swift-dup-a",
    segment: "car",
    brandSlug: "maruti",
    brandName: "Maruti",
    modelSlug: "swift",
    modelName: "Swift",
    variantSlug: "vxi-plus",
    variantName: "VXI Plus",
    fuelType: "petrol",
    transmission: "mt",
    modelYear: 2025,
  }),
  variant({
    id: "cat-swift-dup-b",
    segment: "car",
    brandSlug: "maruti",
    brandName: "Maruti",
    modelSlug: "swift",
    modelName: "Swift",
    variantSlug: "vxi-plus-alt",
    variantName: "VXI Plus Alt",
    fuelType: "petrol",
    transmission: "mt",
    modelYear: 2025,
  }),
];

function listing(partial: Omit<ListingRecord, "source"> & { source?: ListingRecord["source"] }): ListingRecord {
  return { source: "vehicles", ...partial };
}

describe("segment inference", () => {
  it("maps used-cars category to car segment", () => {
    assert.equal(inferSegmentFromCategory("used-cars"), "car");
  });

  it("maps bikes category to bike segment", () => {
    assert.equal(inferSegmentFromCategory("bikes"), "bike");
  });
});

describe("listing mapper", () => {
  it("maps vehicle row to listing record", () => {
    const row = vehicleRowToListing({
      id: "v1",
      brand: "Hyundai",
      model: "Creta",
      variant: "SX(O)",
      fuelType: "diesel",
      transmission: "automatic",
      year: 2025,
      category: "cars",
    });
    assert.equal(row.source, "vehicles");
    assert.equal(row.category, "cars");
  });

  it("falls back variant to model when variant is empty", () => {
    const input = listingToMatchInput(
      listing({
        id: "v2",
        brand: "Hyundai",
        model: "Creta",
        variant: null,
        fuel: "diesel",
        transmission: "automatic",
        modelYear: 2025,
        category: "cars",
      }),
    );
    assert.equal(input?.variant, "Creta");
  });
});

describe("CatalogLinkingService", () => {
  const matcher = createCatalogMatchingService(CATALOG);
  const linker = createCatalogLinkingService(matcher);

  it("returns MATCHED for high-confidence normalized listing", () => {
    const row = linker.analyzeListing(
      listing({
        id: "l-creta",
        brand: "Hyundai Motor India",
        model: "Creta",
        variant: "SX(O) 1.5 Diesel Automatic",
        fuel: "Diesel",
        transmission: "Automatic",
        modelYear: 2025,
        category: "cars",
      }),
    );
    assert.equal(row.matchStatus, "MATCHED");
    assert.equal(row.catalogVariantId, "cat-creta");
    assert.ok(row.confidence >= 80);
    assert.ok(row.businessKey);
    assert.ok(row.reason.includes("match"));
  });

  it("returns NO_MATCH when brand/model missing", () => {
    const row = linker.analyzeListing(
      listing({
        id: "l-empty",
        brand: "",
        model: "Creta",
        variant: "X",
        fuel: "Petrol",
        transmission: "Manual",
        modelYear: 2025,
      }),
    );
    assert.equal(row.matchStatus, "NO_MATCH");
    assert.equal(row.confidence, 0);
    assert.equal(row.catalogVariantId, null);
  });

  it("returns NO_MATCH for unknown listing", () => {
    const row = linker.analyzeListing(
      listing({
        id: "l-unknown",
        brand: "Unknown OEM",
        model: "Unknown Model",
        variant: "Base",
        fuel: "Petrol",
        transmission: "Manual",
        modelYear: 1990,
      }),
    );
    assert.equal(row.matchStatus, "NO_MATCH");
    assert.equal(row.confidence, 0);
  });

  it("returns MULTIPLE_MATCHES when fuzzy tier ties", () => {
    const ambiguousCatalog: CatalogVariantRecord[] = [
      variant({
        id: "tie-a",
        segment: "car",
        brandSlug: "maruti",
        brandName: "Maruti",
        modelSlug: "swift",
        modelName: "Swift",
        variantSlug: "foo-bar-baz-qux",
        variantName: "Foo Bar Baz Qux",
        fuelType: "petrol",
        transmission: "mt",
        modelYear: 2025,
      }),
      variant({
        id: "tie-b",
        segment: "car",
        brandSlug: "maruti",
        brandName: "Maruti",
        modelSlug: "swift",
        modelName: "Swift",
        variantSlug: "foo-bar-baz-quz",
        variantName: "Foo Bar Baz Qux",
        fuelType: "petrol",
        transmission: "mt",
        modelYear: 2025,
      }),
    ];
    const tieMatcher = createCatalogMatchingService(ambiguousCatalog, { fuzzyMinScore: 0.7 });
    const tieLinker = createCatalogLinkingService(tieMatcher);
    const row = tieLinker.analyzeListing(
      listing({
        id: "l-tie",
        brand: "Maruti",
        model: "Swift",
        variant: "Foo Bar Baz",
        fuel: "Petrol",
        transmission: "Manual",
        modelYear: 2025,
      }),
    );
    assert.equal(row.matchStatus, "MULTIPLE_MATCHES");
    assert.equal(row.catalogVariantId, null);
    assert.ok(row.candidateVariantIds && row.candidateVariantIds.length >= 2);
  });

  it("returns LOW_CONFIDENCE for fuzzy-only match", () => {
    const fuzzyOnly = createCatalogMatchingService(CATALOG, { fuzzyMinScore: 0.65 });
    const fuzzyLinker = createCatalogLinkingService(fuzzyOnly);
    const row = fuzzyLinker.analyzeListing(
      listing({
        id: "l-fuzzy",
        brand: "Hyundai",
        model: "Creta",
        variant: "SX-O 1.5 Dsl Automatic",
        fuel: "Diesel",
        transmission: "Automatic",
        modelYear: 2025,
      }),
    );
    assert.equal(row.matchStatus, "LOW_CONFIDENCE");
    assert.equal(row.confidence, 60);
    assert.equal(row.catalogVariantId, "cat-creta");
  });

  it("buildReport aggregates summary counts", () => {
    const report = linker.buildReport([
      listing({
        id: "l1",
        brand: "Hyundai Motor India",
        model: "Creta",
        variant: "SX(O) 1.5 Diesel Automatic",
        fuel: "Diesel",
        transmission: "Automatic",
        modelYear: 2025,
      }),
      listing({
        id: "l2",
        brand: "Unknown",
        model: "Unknown",
        variant: "X",
        fuel: "Petrol",
        transmission: "Manual",
        modelYear: 2010,
      }),
    ]);
    assert.equal(report.dryRun, true);
    assert.equal(report.summary.totalListings, 2);
    assert.equal(report.summary.matched, 1);
    assert.equal(report.summary.noMatch, 1);
  });

  it("never includes database write side effects (pure analysis)", () => {
    const listings = [
      listing({
        id: "l-immutable",
        brand: "Maruti Suzuki",
        model: "Swift",
        variant: "VXI",
        fuel: "Petrol",
        transmission: "Manual",
        modelYear: 2025,
      }),
    ];
    const before = JSON.stringify(listings);
    linker.buildReport(listings);
    assert.equal(JSON.stringify(listings), before);
  });
});

describe("linking reports", () => {
  it("generates CSV with required columns", () => {
    const matcher = createCatalogMatchingService(CATALOG);
    const report = createCatalogLinkingService(matcher).buildReport([
      listing({
        id: "csv-1",
        brand: "Hyundai",
        model: "Creta",
        variant: "SX(O) 1.5 Diesel Automatic",
        fuel: "Diesel",
        transmission: "Automatic",
        modelYear: 2025,
      }),
    ]);
    const csv = catalogLinkReportToCsv(report);
    assert.ok(csv.startsWith("listing_id,source,brand,model,variant,match_status"));
    assert.ok(csv.includes("csv-1"));
    assert.ok(csv.includes("MATCHED"));
  });

  it("generates JSON report envelope", () => {
    const matcher = createCatalogMatchingService(CATALOG);
    const report = createCatalogLinkingService(matcher).buildReport([]);
    const json = catalogLinkReportToJson(report);
    const parsed = JSON.parse(json) as { dryRun: boolean; summary: { totalListings: number } };
    assert.equal(parsed.dryRun, true);
    assert.equal(parsed.summary.totalListings, 0);
  });

  it("formats human-readable summary", () => {
    const matcher = createCatalogMatchingService(CATALOG);
    const report = createCatalogLinkingService(matcher).buildReport([]);
    const text = formatSummaryText(report);
    assert.ok(text.includes("Total listings"));
    assert.ok(text.includes("no database writes"));
  });
});

describe("matchCandidates", () => {
  it("returns multiple fuzzy candidates when scores tie", () => {
    const tieCatalog: CatalogVariantRecord[] = [
      variant({
        id: "a",
        segment: "car",
        brandSlug: "maruti",
        brandName: "Maruti",
        modelSlug: "swift",
        modelName: "Swift",
        variantSlug: "foo-bar-baz-qux",
        variantName: "Foo Bar Baz Qux",
        fuelType: "petrol",
        transmission: "mt",
        modelYear: 2025,
      }),
      variant({
        id: "b",
        segment: "car",
        brandSlug: "maruti",
        brandName: "Maruti",
        modelSlug: "swift",
        modelName: "Swift",
        variantSlug: "foo-bar-baz-quz",
        variantName: "Foo Bar Baz Qux",
        fuelType: "petrol",
        transmission: "mt",
        modelYear: 2025,
      }),
    ];
    const matcher = createCatalogMatchingService(tieCatalog, { fuzzyMinScore: 0.7 });
    const candidates = matcher.matchCandidates({
      segment: "car",
      brand: "Maruti",
      model: "Swift",
      variant: "Foo Bar Baz",
      fuel: "Petrol",
      transmission: "Manual",
      modelYear: 2025,
    });
    assert.ok(candidates.length >= 2);
    assert.equal(candidates[0]?.method, "fuzzy");
  });
});
