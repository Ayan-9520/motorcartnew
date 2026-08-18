import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCatalogKnowledge, buildHighlights, buildRecommendations } from "./approval-anomalies";
import { mergeApprovalConfig, resolveApprovalState } from "./approval-rules";
import {
  catalogApprovalReportToCsv,
  catalogApprovalReportToHtml,
  catalogApprovalReportToJson,
  formatApprovalSummaryText,
} from "./approval-report";
import { catalogVariantRecordFromParts } from "./catalog-linking.loader";
import { createCatalogLinkingService } from "./catalog-linking.service";
import { createCatalogMatchingService } from "./catalog-matching.service";
import { createCatalogApprovalService } from "./catalog-approval.service";
import type { CatalogLinkReport, CatalogLinkRow, ListingRecord } from "./linking-types";
import type { CatalogVariantRecord } from "./types";

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
    id: "cat-dup-a",
    segment: "car",
    brandSlug: "tata",
    brandName: "Tata",
    modelSlug: "nexon",
    modelName: "Nexon",
    variantSlug: "xz-plus",
    variantName: "XZ Plus",
    fuelType: "petrol",
    transmission: "mt",
    modelYear: 2025,
    businessKey: "car|tata|nexon|xz-plus|petrol|mt|2025",
  }),
  variant({
    id: "cat-dup-b",
    segment: "car",
    brandSlug: "tata",
    brandName: "Tata",
    modelSlug: "nexon",
    modelName: "Nexon",
    variantSlug: "xz-plus-dup",
    variantName: "XZ Plus Dup",
    fuelType: "petrol",
    transmission: "mt",
    modelYear: 2025,
    businessKey: "car|tata|nexon|xz-plus|petrol|mt|2025",
  }),
];

function linkReport(rows: CatalogLinkRow[]): CatalogLinkReport {
  return {
    generatedAt: new Date(0).toISOString(),
    dryRun: true,
    summary: {
      totalListings: rows.length,
      matched: rows.filter((r) => r.matchStatus === "MATCHED").length,
      multiple: rows.filter((r) => r.matchStatus === "MULTIPLE_MATCHES").length,
      lowConfidence: rows.filter((r) => r.matchStatus === "LOW_CONFIDENCE").length,
      noMatch: rows.filter((r) => r.matchStatus === "NO_MATCH").length,
      bySource: {
        vehicles: { totalListings: rows.length, matched: 0, multiple: 0, lowConfidence: 0, noMatch: 0 },
        newCarInventory: { totalListings: 0, matched: 0, multiple: 0, lowConfidence: 0, noMatch: 0 },
      },
    },
    rows,
  };
}

function listing(partial: Omit<ListingRecord, "source"> & { source?: ListingRecord["source"] }): ListingRecord {
  return { source: "vehicles", ...partial };
}

describe("approval rules", () => {
  it("AUTO_APPROVED when confidence >= 98", () => {
    const row: CatalogLinkRow = {
      listingId: "1",
      source: "vehicles",
      brand: "Hyundai",
      model: "Creta",
      variant: "X",
      matchStatus: "MATCHED",
      confidence: 100,
      catalogVariantId: "cat-creta",
      businessKey: "k",
      matchMethod: "exact",
      reason: "exact",
    };
    assert.equal(resolveApprovalState(row).state, "AUTO_APPROVED");
  });

  it("MANUAL_REVIEW when confidence 80–97", () => {
    const row: CatalogLinkRow = {
      listingId: "2",
      source: "vehicles",
      brand: "Hyundai",
      model: "Creta",
      variant: "X",
      matchStatus: "MATCHED",
      confidence: 95,
      catalogVariantId: "cat-creta",
      businessKey: "k",
      matchMethod: "normalized",
      reason: "normalized",
    };
    assert.equal(resolveApprovalState(row).state, "MANUAL_REVIEW");
  });

  it("REJECTED when confidence < 80", () => {
    const row: CatalogLinkRow = {
      listingId: "3",
      source: "vehicles",
      brand: "Hyundai",
      model: "Creta",
      variant: "X",
      matchStatus: "LOW_CONFIDENCE",
      confidence: 60,
      catalogVariantId: "cat-creta",
      businessKey: "k",
      matchMethod: "fuzzy",
      reason: "fuzzy",
    };
    assert.equal(resolveApprovalState(row).state, "REJECTED");
  });

  it("MANUAL_REVIEW on MULTIPLE_MATCHES", () => {
    const row: CatalogLinkRow = {
      listingId: "4",
      source: "vehicles",
      brand: "Maruti",
      model: "Swift",
      variant: "X",
      matchStatus: "MULTIPLE_MATCHES",
      confidence: 60,
      catalogVariantId: null,
      businessKey: null,
      matchMethod: null,
      reason: "ambiguous",
      candidateVariantIds: ["a", "b"],
    };
    assert.equal(resolveApprovalState(row).state, "MANUAL_REVIEW");
  });

  it("supports configurable thresholds", () => {
    const row: CatalogLinkRow = {
      listingId: "5",
      source: "vehicles",
      brand: "Hyundai",
      model: "Creta",
      variant: "X",
      matchStatus: "MATCHED",
      confidence: 95,
      catalogVariantId: "cat-creta",
      businessKey: "k",
      matchMethod: "normalized",
      reason: "normalized",
    };
    const config = mergeApprovalConfig({ autoApproveMinConfidence: 90 });
    assert.equal(resolveApprovalState(row, config).state, "AUTO_APPROVED");
  });
});

describe("approval anomalies", () => {
  it("detects duplicate business keys in catalog", () => {
    const knowledge = buildCatalogKnowledge(CATALOG);
    assert.ok(knowledge.businessKeyToVariantIds.get("car|tata|nexon|xz-plus|petrol|mt|2025")!.length >= 2);
  });

  it("builds recommendations for unknown brand", () => {
    const rows: CatalogLinkRow[] = [
      {
        listingId: "u1",
        source: "vehicles",
        brand: "Mystery Motors",
        model: "X1",
        variant: "Base",
        matchStatus: "NO_MATCH",
        confidence: 0,
        catalogVariantId: null,
        businessKey: null,
        matchMethod: null,
        reason: "none",
      },
    ];
    const knowledge = buildCatalogKnowledge(CATALOG);
    const highlights = buildHighlights(rows, knowledge, new Map());
    const recs = buildRecommendations(rows, highlights);
    assert.ok(recs.some((r) => r.kind === "CREATE_ALIAS"));
  });
});

describe("CatalogApprovalService", () => {
  const matcher = createCatalogMatchingService(CATALOG);
  const linker = createCatalogLinkingService(matcher);
  const approval = createCatalogApprovalService(CATALOG);

  it("reviews Phase 2C link report end-to-end", () => {
    const listings: ListingRecord[] = [
      listing({
        id: "exact-1",
        brand: "Hyundai",
        model: "Creta",
        variant: "sx-o-1-5-diesel-automatic",
        fuel: "diesel",
        transmission: "at",
        modelYear: 2025,
      }),
      listing({
        id: "unknown-1",
        brand: "Mystery Motors",
        model: "Z9",
        variant: "Base",
        fuel: "Unobtanium",
        transmission: "Flux",
        modelYear: 2025,
      }),
    ];

    const link = linker.buildReport(listings);
    const report = approval.review({
      linkReport: link,
      listingContext: [
        { listingId: "exact-1", dealerId: "d1", dealerName: "Alpha Motors", city: "Mumbai", fuel: "diesel", transmission: "at" },
        { listingId: "unknown-1", dealerId: "d2", dealerName: "Beta Auto", city: "Delhi", fuel: "Unobtanium", transmission: "Flux" },
      ],
    });

    assert.equal(report.dryRun, true);
    assert.equal(report.rows.length, 2);
    assert.equal(report.rows[0]?.approvalState, "AUTO_APPROVED");
    assert.equal(report.rows[1]?.approvalState, "REJECTED");
    assert.ok(report.breakdown.byBrand["Hyundai"]);
    assert.ok(report.breakdown.byDealer["Alpha Motors"]);
    assert.ok(report.breakdown.byCity["Mumbai"]);
    assert.ok(report.highlights.unknownBrands.length >= 1);
    assert.ok(report.recommendations.length >= 1);
  });

  it("never mutates input reports", () => {
    const rows: CatalogLinkRow[] = [
      {
        listingId: "x",
        source: "vehicles",
        brand: "Hyundai",
        model: "Creta",
        variant: "sx-o-1-5-diesel-automatic",
        matchStatus: "MATCHED",
        confidence: 100,
        catalogVariantId: "cat-creta",
        businessKey: "k",
        matchMethod: "exact",
        reason: "exact",
      },
    ];
    const input = linkReport(rows);
    const before = JSON.stringify(input);
    approval.review({ linkReport: input });
    assert.equal(JSON.stringify(input), before);
  });
});

describe("approval reports", () => {
  it("generates CSV, JSON, and HTML", () => {
    const report = createCatalogApprovalService(CATALOG).review({
      linkReport: linkReport([
        {
          listingId: "r1",
          source: "vehicles",
          brand: "Hyundai",
          model: "Creta",
          variant: "X",
          matchStatus: "MATCHED",
          confidence: 100,
          catalogVariantId: "cat-creta",
          businessKey: "k",
          matchMethod: "exact",
          reason: "exact",
        },
      ]),
    });

    const csv = catalogApprovalReportToCsv(report);
    assert.ok(csv.includes("approval_state"));
    assert.ok(csv.includes("AUTO_APPROVED"));

    const json = JSON.parse(catalogApprovalReportToJson(report)) as { dryRun: boolean };
    assert.equal(json.dryRun, true);

    const html = catalogApprovalReportToHtml(report);
    assert.ok(html.includes("Catalog Review"));
    assert.ok(html.includes("Dry run"));

    const text = formatApprovalSummaryText(report);
    assert.ok(text.includes("Auto approved"));
  });
});
