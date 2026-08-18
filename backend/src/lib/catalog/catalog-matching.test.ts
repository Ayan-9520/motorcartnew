import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCatalogBusinessKey } from "./business-key";
import { CatalogMatchingService, buildCatalogMatchingIndex, createCatalogMatchingService } from "./catalog-matching.service";
import { DEFAULT_NORMALIZATION_CONFIG, normalizeFuelValue, normalizeMatchFields, normalizeTransmissionValue } from "./normalization";
import { applyBrandAlias } from "./aliases";
import { fuzzyVariantScore } from "./fuzzy";
import type { CatalogVariantRecord } from "./types";

function variant(partial: Omit<CatalogVariantRecord, "businessKey"> & { businessKey?: string }): CatalogVariantRecord {
  const businessKey =
    partial.businessKey ??
    buildCatalogBusinessKey({
      segment: partial.segment,
      brandSlug: partial.brandSlug,
      modelSlug: partial.modelSlug,
      variantSlug: partial.variantSlug,
      fuelType: partial.fuelType,
      transmission: partial.transmission,
      modelYear: partial.modelYear,
    });
  return { ...partial, businessKey };
}

const FIXTURE: CatalogVariantRecord[] = [
  variant({
    id: "v-creta-diesel-at",
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
    id: "v-swift-petrol-mt",
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
    id: "v-swift-cng",
    segment: "car",
    brandSlug: "maruti",
    brandName: "Maruti",
    modelSlug: "swift",
    modelName: "Swift",
    variantSlug: "vxi-cng",
    variantName: "VXI CNG",
    fuelType: "petrol+cng",
    transmission: "mt",
    modelYear: 2025,
  }),
];

describe("catalog normalization", () => {
  it("normalizes brand Maruti Suzuki to maruti slug", () => {
    const n = normalizeMatchFields({
      segment: "car",
      brand: "Maruti Suzuki",
      model: "Swift",
      variant: "VXI",
      fuel: "Petrol",
      transmission: "Manual",
      modelYear: 2025,
    });
    assert.equal(n.brandSlug, "maruti");
    assert.equal(n.transmissionSlug, "mt");
    assert.equal(n.fuelSlug, "petrol");
  });

  it("normalizes fuel Petrol + CNG", () => {
    assert.equal(normalizeFuelValue("Petrol + CNG"), "petrol+cng");
  });

  it("normalizes transmission Automatic to at", () => {
    assert.equal(normalizeTransmissionValue("Automatic"), "at");
  });

  it("applies brand alias ms -> maruti", () => {
    assert.equal(applyBrandAlias("ms"), "maruti");
  });
});

describe("catalog fuzzy scoring", () => {
  it("scores similar variant slugs higher", () => {
    const score = fuzzyVariantScore("sx-o-1-5-diesel-automatic", "sx-o-15-diesel-automatic");
    assert.ok(score >= 0.72);
  });
});

describe("CatalogMatchingService", () => {
  const service = createCatalogMatchingService(FIXTURE);

  it("exact match returns confidence 100", () => {
    const r = service.match({
      segment: "car",
      brand: "Hyundai",
      model: "Creta",
      variant: "sx-o-1-5-diesel-automatic",
      fuel: "diesel",
      transmission: "at",
      modelYear: 2025,
    });
    assert.equal(r.confidence, 100);
    assert.equal(r.method, "exact");
    assert.equal(r.catalogVariantId, "v-creta-diesel-at");
  });

  it("normalized match returns confidence 95", () => {
    const r = service.match({
      segment: "car",
      brand: "Hyundai Motor India",
      model: "Creta",
      variant: "SX(O) 1.5 Diesel Automatic",
      fuel: "Diesel",
      transmission: "Automatic",
      modelYear: 2025,
    });
    assert.ok(r.confidence === 95 || r.confidence === 100);
    assert.ok(r.method === "normalized" || r.method === "exact");
    assert.equal(r.catalogVariantId, "v-creta-diesel-at");
  });

  it("alias match returns confidence 80 for MS brand alias", () => {
    const r = service.match({
      segment: "car",
      brand: "MS",
      model: "Swift",
      variant: "VXI",
      fuel: "Petrol",
      transmission: "Manual",
      modelYear: 2025,
    });
    assert.equal(r.confidence, 80);
    assert.equal(r.method, "alias");
    assert.equal(r.catalogVariantId, "v-swift-petrol-mt");
  });

  it("normalized match for petrol+cng fuel label", () => {
    const r = service.match({
      segment: "car",
      brand: "Maruti Suzuki",
      model: "Swift",
      variant: "VXI CNG",
      fuel: "Petrol + CNG",
      transmission: "Manual",
      modelYear: 2025,
    });
    assert.equal(r.catalogVariantId, "v-swift-cng");
    assert.ok(r.confidence >= 95);
  });

  it("fuzzy match returns confidence 60 for close variant spelling", () => {
    const fuzzyService = new CatalogMatchingService(buildCatalogMatchingIndex(FIXTURE), {
      normalization: {
        brandReplacements: [],
        fuelReplacements: DEFAULT_NORMALIZATION_CONFIG.fuelReplacements,
        transmissionReplacements: DEFAULT_NORMALIZATION_CONFIG.transmissionReplacements,
        variantReplacements: [],
        variantStopWords: [],
      },
      aliases: { brands: [], fuels: [], transmissions: [] },
      fuzzyMinScore: 0.65,
    });
    const r = fuzzyService.match({
      segment: "car",
      brand: "Hyundai",
      model: "Creta",
      variant: "SX-O 1.5 Dsl Automatic",
      fuel: "Diesel",
      transmission: "Automatic",
      modelYear: 2025,
    });
    assert.equal(r.confidence, 60);
    assert.equal(r.method, "fuzzy");
    assert.equal(r.catalogVariantId, "v-creta-diesel-at");
  });

  it("no match returns confidence 0", () => {
    const r = service.match({
      segment: "car",
      brand: "Unknown",
      model: "Unknown",
      variant: "Base",
      fuel: "Petrol",
      transmission: "Manual",
      modelYear: 1999,
    });
    assert.equal(r.confidence, 0);
    assert.equal(r.method, "none");
    assert.equal(r.catalogVariantId, null);
  });

  it("never mutates input or writes (result only)", () => {
    const input = {
      segment: "car",
      brand: "Hyundai",
      model: "Creta",
      variant: "SX(O) 1.5 Diesel Automatic",
      fuel: "Diesel",
      transmission: "Automatic",
      modelYear: 2025,
    };
    const before = JSON.stringify(input);
    const r = service.match(input);
    assert.equal(JSON.stringify(input), before);
    assert.ok(r.catalogVariantId);
    assert.ok(r.matchedVariant);
  });

  it("matchMany returns parallel results", () => {
    const results = service.matchMany([
      {
        segment: "car",
        brand: "Hyundai",
        model: "Creta",
        variant: "SX(O) 1.5 Diesel Automatic",
        fuel: "Diesel",
        transmission: "Automatic",
        modelYear: 2025,
      },
      {
        segment: "car",
        brand: "Unknown",
        model: "X",
        variant: "Y",
        fuel: "Petrol",
        transmission: "Manual",
        modelYear: 2020,
      },
    ]);
    assert.equal(results.length, 2);
    assert.ok(results[0]!.confidence >= 95);
    assert.equal(results[1]?.confidence, 0);
  });
});

describe("matching priority order", () => {
  it("prefers exact over normalized when both would match same variant", () => {
    const svc = createCatalogMatchingService(FIXTURE);
    const r = svc.match({
      segment: "car",
      brand: "maruti",
      model: "swift",
      variant: "vxi",
      fuel: "petrol",
      transmission: "mt",
      modelYear: 2025,
    });
    assert.equal(r.method, "exact");
    assert.equal(r.confidence, 100);
  });
});
