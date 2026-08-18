import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCatalogImportPreview } from "./catalog-import-preview.mapper";
import type { CatalogImportJobResult } from "./catalog-import-job.types";
import { ImportContext } from "./import-context";

function makeResult(options: {
  records: Array<{
    rowNumber: number;
    brand: string;
    model: string;
    variant?: string;
    fuel?: string;
    transmission?: string;
    city?: string;
    price?: string;
    imageUrl?: string;
  }>;
  validationErrors?: Array<{ rowNumber: number; field: string; message: string }>;
  duplicates?: Array<{ rowNumber: number; classification: "DUPLICATE" | "POSSIBLE_DUPLICATE" | "UNIQUE"; signals?: string[] }>;
  matching?: Array<{ confidence: 100 | 95 | 80 | 60 | 0; method: "exact" | "normalized" | "alias" | "fuzzy" | "none" }>;
}): CatalogImportJobResult {
  const context = ImportContext.create({ sourceType: "scraper", dryRun: true }, "catalog-import-preview-test");
  const importRecords = options.records.map((r) => ({
    rowNumber: r.rowNumber,
    segment: "car" as const,
    fields: {
      brand: r.brand,
      model: r.model,
      variant: r.variant ?? "Base",
      fuel: r.fuel ?? "Petrol",
      transmission: r.transmission ?? "Manual",
      city: r.city ?? "Delhi",
      exShowroomPrice: r.price ?? "500000",
      imageUrl: r.imageUrl ?? "https://cdn.example.com/car.jpg",
    },
  }));
  context.setRecords(importRecords);
  context.setNormalizedRecords(importRecords);

  if (options.validationErrors?.length) {
    context.metadata.catalogValidationReport = {
      validRecords: [],
      rejectedRecords: options.validationErrors.map((e) => ({
        rowNumber: e.rowNumber,
        record: { brand: "X", model: "Y" },
        errors: [
          {
            code: "TEST",
            message: e.message,
            field: e.field,
            rowNumber: e.rowNumber,
            severity: "error" as const,
          },
        ],
      })),
      warnings: [],
      errors: options.validationErrors.map((e) => ({
        code: "TEST",
        message: e.message,
        field: e.field,
        rowNumber: e.rowNumber,
        severity: "error" as const,
      })),
      summary: {
        totalRows: options.records.length,
        validCount: 0,
        rejectedCount: options.validationErrors.length,
        errorCount: options.validationErrors.length,
        warningCount: 0,
        errorsByCode: {},
        errorsByField: {},
      },
    };
  }

  if (options.duplicates?.length) {
    context.metadata.catalogDuplicateReport = {
      checked: true as const,
      results: options.duplicates.map((d) => ({
        rowNumber: d.rowNumber,
        classification: d.classification,
        businessKey: "bk",
        matchedSignals: (d.signals ?? ["business_key"]) as Array<
          "business_key" | "source_id" | "image_url" | "attributes" | "attributes_price"
        >,
        groupIds: ["g1"],
      })),
      groups: [],
      mergeRecommendations: [],
      summary: {
        totalRecords: options.records.length,
        duplicateCount: options.duplicates.filter((d) => d.classification === "DUPLICATE").length,
        possibleDuplicateCount: options.duplicates.filter((d) => d.classification === "POSSIBLE_DUPLICATE").length,
        uniqueCount: options.duplicates.filter((d) => d.classification === "UNIQUE").length,
        groupCount: 1,
        bySignal: {
          business_key: 1,
          source_id: 0,
          image_url: 0,
          attributes: 0,
          attributes_price: 0,
        },
      },
    };
  }

  if (options.matching) {
    context.setMatching({
      checked: true,
      resultCount: options.matching.length,
      exactMatches: options.matching.filter((m) => m.confidence >= 95).length,
      weakMatches: options.matching.filter((m) => m.confidence > 0 && m.confidence < 95).length,
      noMatches: options.matching.filter((m) => m.confidence === 0).length,
      results: options.matching.map((m) => ({
        catalogVariantId: m.confidence > 0 ? "v1" : null,
        businessKey: m.confidence > 0 ? "bk" : null,
        confidence: m.confidence,
        method: m.method,
      })),
    });
  } else {
    context.setMatching({
      checked: false,
      resultCount: 0,
      exactMatches: 0,
      weakMatches: 0,
      noMatches: 0,
      results: [],
    });
  }

  return {
    jobId: "catalog-import-preview-test",
    success: true,
    input: { source: "gaadi_bazaar", pages: 1 },
    payload: null,
    scrapeErrors: [],
    pipeline: {
      jobId: "catalog-import-preview-test",
      success: true,
      completedStages: ["preview"],
      finalStage: "preview",
      context,
    },
    report: {
      generatedAt: new Date().toISOString(),
      dryRun: true,
      input: { source: "gaadi_bazaar", pages: 1 },
      stages: [],
      scrapeStats: null,
      importSummary: {
        recordCount: options.records.length,
        normalizedCount: options.records.length,
        duplicateCount: 0,
        matchingExact: 0,
        matchingNoMatch: 0,
        approvalDecision: null,
        storageUploads: 0,
        previewCount: options.records.length,
        published: false,
      },
      errorSummary: { totalErrors: 0, scrapeErrors: 0, importErrors: 0, byCode: {}, items: [] },
      performance: {
        totalDurationMs: 1,
        playwrightWorkerMs: 0,
        scraperMs: 0,
        importPipelineMs: 1,
        recordsPerSecond: 1,
        vehicleCardsPerSecond: 1,
      },
    },
  };
}

describe("buildCatalogImportPreview", () => {
  it("marks clean rows as valid when matching is skipped", () => {
    const preview = buildCatalogImportPreview(
      "catalog-import-preview-test",
      makeResult({
        records: [{ rowNumber: 1, brand: "Hyundai", model: "Creta", city: "Delhi" }],
      }),
    );

    assert.equal(preview.summary.totalRecords, 1);
    assert.equal(preview.summary.valid, 1);
    assert.equal(preview.records[0]?.status, "valid");
    assert.equal(preview.records[0]?.brand, "Hyundai");
    assert.equal(preview.dryRun, true);
    assert.equal(preview.published, false);
  });

  it("classifies duplicate / need_review / rejected from pipeline signals", () => {
    const preview = buildCatalogImportPreview(
      "catalog-import-preview-test",
      makeResult({
        records: [
          { rowNumber: 1, brand: "A", model: "One" },
          { rowNumber: 2, brand: "B", model: "Two" },
          { rowNumber: 3, brand: "C", model: "Three" },
          { rowNumber: 4, brand: "D", model: "Four" },
        ],
        validationErrors: [{ rowNumber: 4, field: "fuel", message: "Invalid fuel" }],
        duplicates: [
          { rowNumber: 1, classification: "UNIQUE" },
          { rowNumber: 2, classification: "DUPLICATE", signals: ["business_key"] },
          { rowNumber: 3, classification: "POSSIBLE_DUPLICATE", signals: ["image_url"] },
          { rowNumber: 4, classification: "UNIQUE" },
        ],
        matching: [
          { confidence: 100, method: "exact" },
          { confidence: 95, method: "normalized" },
          { confidence: 60, method: "fuzzy" },
          { confidence: 0, method: "none" },
        ],
      }),
    );

    assert.equal(preview.summary.valid, 1);
    assert.equal(preview.summary.duplicate, 1);
    assert.equal(preview.summary.needReview, 1);
    assert.equal(preview.summary.rejected, 1);
    assert.ok(preview.records.find((r) => r.rowNumber === 2)?.duplicateReason?.includes("business_key"));
    assert.ok(preview.records.find((r) => r.rowNumber === 4)?.validationErrors.length);
  });
});
