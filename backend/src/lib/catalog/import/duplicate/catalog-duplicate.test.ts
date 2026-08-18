import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { businessKeyFromLabels } from "../../business-key";
import { DEFAULT_CATALOG_IMPORT_SEGMENT } from "../catalog-segment";
import {
  detectCatalogDuplicates,
  detectDuplicatesFromImportRecords,
  importRecordToDuplicateRecord,
  toImportDuplicateReport,
} from "./duplicate-detection.engine";
import { buildRecordFingerprints, fingerprintForSignal } from "./duplicate-fingerprints";
import { buildDuplicateReportBundle, duplicateGroupsToCsv, mergeRecommendationsToCsv } from "./duplicate-report";
import type { DuplicateDetectionRecord } from "./duplicate-types";
import { ImportContext } from "../import-context";
import { createImportPipeline } from "../import-pipeline";
import { importSuccess, type ImportRecord } from "../import-types";

function record(
  partial: Partial<DuplicateDetectionRecord> & Pick<DuplicateDetectionRecord, "rowNumber">,
): DuplicateDetectionRecord {
  return {
    segment: DEFAULT_CATALOG_IMPORT_SEGMENT,
    brand: "hyundai",
    model: "creta",
    variant: "sx",
    fuel: "diesel",
    transmission: "at",
    year: 2025,
    bodyType: null,
    color: null,
    exShowroomPrice: 1490000,
    onRoadPrice: null,
    city: "Mumbai",
    state: "Maharashtra",
    imageUrl: "https://example.com/creta.jpg",
    brochureUrl: null,
    description: null,
    features: [],
    ...partial,
  };
}

function importRow(rowNumber: number, fields: Record<string, string | number | null>): ImportRecord {
  return { rowNumber, segment: DEFAULT_CATALOG_IMPORT_SEGMENT, fields };
}

describe("duplicate fingerprints", () => {
  it("builds business key and attribute fingerprints", () => {
    const fp = buildRecordFingerprints(record({ rowNumber: 2, sourceId: "oem-123" }));
    const expectedKey = businessKeyFromLabels({
      segment: "car",
      brand: "hyundai",
      model: "creta",
      variant: "sx",
      fuel: "diesel",
      transmission: "at",
      modelYear: 2025,
    });
    assert.equal(fp.businessKey, expectedKey);
    assert.equal(fp.sourceId, "oem-123");
    assert.equal(fingerprintForSignal(fp, "business_key"), expectedKey);
    assert.equal(fingerprintForSignal(fp, "image_url"), "https://example.com/creta.jpg");
  });

  it("returns null for empty source id and image url", () => {
    const fp = buildRecordFingerprints(record({ rowNumber: 3, sourceId: null, imageUrl: null }));
    assert.equal(fingerprintForSignal(fp, "source_id"), null);
    assert.equal(fingerprintForSignal(fp, "image_url"), null);
  });
});

describe("detectCatalogDuplicates", () => {
  it("classifies exact business key matches as DUPLICATE", () => {
    const report = detectCatalogDuplicates([
      record({ rowNumber: 2 }),
      record({ rowNumber: 3, exShowroomPrice: 1550000 }),
    ]);
    assert.equal(report.summary.duplicateCount, 2);
    assert.equal(report.summary.possibleDuplicateCount, 0);
    assert.ok(report.groups.some((g) => g.signal === "business_key"));
    assert.ok(report.mergeRecommendations.some((r) => r.kind === "MERGE_DUPLICATE"));
  });

  it("classifies same source id as DUPLICATE", () => {
    const report = detectCatalogDuplicates([
      record({ rowNumber: 2, sourceId: "feed-99", variant: "sx" }),
      record({ rowNumber: 3, sourceId: "feed-99", variant: "sx plus" }),
    ]);
    assert.ok(report.groups.some((g) => g.signal === "source_id"));
    assert.equal(report.results.every((r) => r.classification === "DUPLICATE"), true);
  });

  it("classifies same core attributes with different price as DUPLICATE via business key", () => {
    const report = detectCatalogDuplicates([
      record({ rowNumber: 2, exShowroomPrice: 1000000 }),
      record({ rowNumber: 3, exShowroomPrice: 1100000 }),
    ]);
    const row2 = report.results.find((r) => r.rowNumber === 2)!;
    assert.equal(row2.classification, "DUPLICATE");
    assert.ok(row2.matchedSignals.includes("business_key"));
    assert.ok(row2.matchedSignals.includes("attributes"));
  });

  it("classifies same attributes different segment as POSSIBLE_DUPLICATE", () => {
    const report = detectCatalogDuplicates([
      record({ rowNumber: 2, segment: "car", exShowroomPrice: 1000000 }),
      record({ rowNumber: 3, segment: "bike", exShowroomPrice: 1100000 }),
    ]);
    assert.equal(report.results.every((r) => r.classification === "POSSIBLE_DUPLICATE"), true);
    assert.ok(report.groups.some((g) => g.signal === "attributes"));
  });

  it("classifies same attributes and price as DUPLICATE via attributes_price", () => {
    const report = detectCatalogDuplicates([
      record({ rowNumber: 2 }),
      record({ rowNumber: 3, city: "Delhi" }),
    ]);
    assert.ok(report.groups.some((g) => g.signal === "attributes_price"));
    assert.equal(report.summary.duplicateCount, 2);
  });

  it("classifies shared image url as POSSIBLE_DUPLICATE", () => {
    const report = detectCatalogDuplicates([
      record({ rowNumber: 2, imageUrl: "https://cdn.example/x.jpg", model: "creta" }),
      record({ rowNumber: 3, imageUrl: "https://cdn.example/x.jpg", model: "venue" }),
    ]);
    assert.ok(report.groups.some((g) => g.signal === "image_url"));
    assert.equal(report.results.every((r) => r.classification === "POSSIBLE_DUPLICATE"), true);
  });

  it("marks unique rows when no signals overlap", () => {
    const report = detectCatalogDuplicates([
      record({ rowNumber: 2, brand: "hyundai", model: "creta" }),
      record({ rowNumber: 3, brand: "tata", model: "nexon", imageUrl: "https://example.com/nexon.jpg" }),
    ]);
    assert.equal(report.summary.uniqueCount, 2);
    assert.equal(report.summary.groupCount, 0);
  });

  it("maps import records including source_id alias", () => {
    const rows = detectDuplicatesFromImportRecords([
      importRow(2, {
        brand: "Hyundai",
        model: "Creta",
        variant: "SX",
        fuel: "Diesel",
        transmission: "Automatic",
        year: 2025,
        source_id: "ext-1",
      }),
      importRow(3, {
        brand: "Hyundai",
        model: "Creta",
        variant: "SX",
        fuel: "Diesel",
        transmission: "Automatic",
        year: 2025,
        source_id: "ext-1",
      }),
    ]);
    assert.equal(rows.summary.duplicateCount, 2);
    const mapped = importRecordToDuplicateRecord(importRow(4, { brand: "Tata", model: "Nexon", variant: "XZ", fuel: "Petrol", transmission: "Manual", year: 2025, externalId: "x-4" }));
    assert.equal(mapped?.sourceId, "x-4");
  });
});

describe("duplicate reports", () => {
  it("generates CSV and JSON bundles", () => {
    const report = detectCatalogDuplicates([record({ rowNumber: 2 }), record({ rowNumber: 3 })]);
    const bundle = buildDuplicateReportBundle(report);
    assert.ok(bundle.groupsCsv.includes("groupId"));
    assert.ok(bundle.mergeCsv.includes("MERGE_DUPLICATE"));
    assert.ok(bundle.json.includes("mergeRecommendations"));
    assert.equal(duplicateGroupsToCsv(report).split("\n").length, report.groups.length + 1);
    assert.equal(mergeRecommendationsToCsv(report).split("\n").length, report.mergeRecommendations.length + 1);
  });

  it("converts to import duplicate report shape", () => {
    const report = detectCatalogDuplicates([record({ rowNumber: 2 }), record({ rowNumber: 3 })]);
    const importReport = toImportDuplicateReport(report);
    assert.equal(importReport.checked, true);
    assert.equal(importReport.duplicateCount, 2);
    assert.ok(importReport.groups!.length > 0);
  });
});

describe("pipeline duplicate_check stage", () => {
  it("runs duplicate detection through full pipeline", async () => {
    const pipeline = createImportPipeline({
      source: {
        type: "csv",
        upload: async (ctx) =>
          importSuccess("upload", {
            sourceType: "csv",
            raw: "",
            receivedAt: new Date().toISOString(),
          }, { metadata: { jobId: ctx.jobId } }),
      },
      parser: {
        supportedSources: ["csv"],
        parse: async () =>
          importSuccess("upload", [
            importRow(2, {
              brand: "Hyundai",
              model: "Creta",
              variant: "SX",
              fuel: "Diesel",
              transmission: "Automatic",
              year: 2025,
            }),
            importRow(3, {
              brand: "Hyundai",
              model: "Creta",
              variant: "SX",
              fuel: "Diesel",
              transmission: "Automatic",
              year: 2025,
            }),
          ]),
      },
    });

    const ctx = ImportContext.create({ sourceType: "csv" });
    const result = await pipeline.run(ctx);
    assert.equal(result.success, true);
    assert.equal(ctx.duplicates?.checked, true);
    assert.equal(ctx.duplicates?.duplicateCount, 2);
    assert.ok(ctx.metadata.catalogDuplicateReport);
    assert.ok(!ctx.warnings.some((w) => w.includes("deferred")));
  });
});
