import type { CatalogLinkReport, CatalogLinkRow } from "./linking-types";

function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const CSV_HEADERS = [
  "listing_id",
  "source",
  "brand",
  "model",
  "variant",
  "match_status",
  "confidence",
  "catalog_variant_id",
  "business_key",
  "match_method",
  "reason",
  "candidate_variant_ids",
] as const;

function rowToCsv(row: CatalogLinkRow): string {
  return [
    row.listingId,
    row.source,
    row.brand,
    row.model,
    row.variant,
    row.matchStatus,
    row.confidence,
    row.catalogVariantId,
    row.businessKey,
    row.matchMethod,
    row.reason,
    row.candidateVariantIds?.join(";") ?? "",
  ]
    .map(escapeCsvField)
    .join(",");
}

/** Serialize a dry-run linking report as CSV (no file I/O). */
export function catalogLinkReportToCsv(report: CatalogLinkReport): string {
  const lines = [CSV_HEADERS.join(",")];
  for (const row of report.rows) {
    lines.push(rowToCsv(row));
  }
  return lines.join("\n");
}

/** Serialize a dry-run linking report as JSON (no file I/O). */
export function catalogLinkReportToJson(report: CatalogLinkReport, pretty = true): string {
  return JSON.stringify(report, null, pretty ? 2 : undefined);
}

export function formatSummaryText(report: CatalogLinkReport): string {
  const s = report.summary;
  return [
    "=== Catalog Linking Dry Run Summary ===",
    `Generated : ${report.generatedAt}`,
    `Dry run   : yes (no database writes)`,
    "",
    `Total listings   : ${s.totalListings}`,
    `Matched          : ${s.matched}`,
    `Multiple matches : ${s.multiple}`,
    `Low confidence   : ${s.lowConfidence}`,
    `No match         : ${s.noMatch}`,
    "",
    "By source:",
    `  vehicles           : ${s.bySource.vehicles.totalListings} total, ${s.bySource.vehicles.matched} matched`,
    `  new_car_inventory  : ${s.bySource.newCarInventory.totalListings} total, ${s.bySource.newCarInventory.matched} matched`,
  ].join("\n");
}
