/**
 * Phase 5F quality report serializers (CSV / JSON / HTML) for controlled live dry-run.
 */
import type { CatalogImportJobResult } from "./catalog-import-job.types";
import type { CatalogValidationReport } from "./validation/validation-types";
import type { DuplicateDetectionReport } from "./duplicate/duplicate-types";
import type { MediaPipelineReport } from "./media/media-types";
import type { GaadiBazaarScrapedVehicle } from "./sources/gaadi-bazaar/gaadi-bazaar-types";

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type CatalogImportLiveQualitySummary = {
  generatedAt: string;
  dryRun: true;
  published: false;
  totalScraped: number;
  successfullyParsed: number;
  validationPassed: number;
  validationFailed: number;
  duplicates: number;
  possibleDuplicates: number;
  matchedCatalogVariants: number;
  unmatchedRecords: number;
  lowConfidenceMatches: number;
  validImages: number;
  brokenImages: number;
  missingFields: Record<string, number>;
  errors: Array<{ code: string; message: string; stage?: string }>;
  runtimeMs: number;
  input: CatalogImportJobResult["input"];
};

export type CatalogImportLiveQualityReport = {
  summary: CatalogImportLiveQualitySummary;
  vehicles: GaadiBazaarScrapedVehicle[];
  job: CatalogImportJobResult["report"];
};

const REQUIRED_FIELDS = [
  "vehicleTitle",
  "brand",
  "model",
  "variant",
  "fuel",
  "transmission",
  "price",
  "city",
  "state",
  "vehicleUrl",
  "sourceId",
  "imageUrl",
] as const;

function countMissingFields(vehicles: GaadiBazaarScrapedVehicle[]): Record<string, number> {
  const missing: Record<string, number> = {};
  for (const field of REQUIRED_FIELDS) {
    missing[field] = 0;
  }
  for (const v of vehicles) {
    for (const field of REQUIRED_FIELDS) {
      const value =
        field === "imageUrl"
          ? v.imageUrl ?? (v.imageUrls && v.imageUrls[0])
          : (v as Record<string, unknown>)[field];
      if (value === undefined || value === null || value === "") {
        missing[field] = (missing[field] ?? 0) + 1;
      }
    }
  }
  return missing;
}

export function buildCatalogImportLiveQualityReport(
  result: CatalogImportJobResult,
): CatalogImportLiveQualityReport {
  const vehicles = result.payload?.vehicles ?? [];
  const validation = result.pipeline?.context.metadata.catalogValidationReport as
    | CatalogValidationReport
    | undefined;
  const duplicates = (result.pipeline?.context.duplicates ??
    result.pipeline?.context.metadata.catalogDuplicateReport) as DuplicateDetectionReport | undefined;
  const media = result.pipeline?.context.media as MediaPipelineReport | undefined;
  const matching = result.pipeline?.context.matching;
  const matchingSkipped = !matching?.checked;

  const lowConfidence =
    matching?.results.filter((r) => r.confidence > 0 && r.confidence < 80).length ?? 0;

  const scrapedWithImage = vehicles.filter((v) => Boolean(v.imageUrl || v.imageUrls?.length)).length;
  const mediaRan = Boolean(media?.processed);

  const summary: CatalogImportLiveQualitySummary = {
    generatedAt: new Date().toISOString(),
    dryRun: true,
    published: false,
    totalScraped: result.report.scrapeStats?.vehicleCardsSeen ?? vehicles.length,
    successfullyParsed: result.report.scrapeStats?.vehiclesExtracted ?? vehicles.length,
    validationPassed: validation?.summary.validCount ?? 0,
    validationFailed: validation?.summary.rejectedCount ?? 0,
    duplicates: duplicates?.summary.duplicateCount ?? 0,
    possibleDuplicates: duplicates?.summary.possibleDuplicateCount ?? 0,
    matchedCatalogVariants: matching?.exactMatches ?? 0,
    unmatchedRecords: matchingSkipped ? vehicles.length : (matching?.noMatches ?? vehicles.length),
    lowConfidenceMatches: lowConfidence,
    validImages: mediaRan ? (media?.summary.validImageCount ?? media?.validImages?.length ?? 0) : scrapedWithImage,
    brokenImages: mediaRan ? (media?.summary.brokenUrlCount ?? media?.brokenUrls?.length ?? 0) : 0,
    missingFields: countMissingFields(vehicles),
    errors: result.report.errorSummary.items.map((i) => ({
      code: i.code,
      message: i.message,
      stage: String(i.stage),
    })),
    runtimeMs: result.report.performance.totalDurationMs,
    input: result.input,
  };

  return {
    summary,
    vehicles,
    job: result.report,
  };
}

export function catalogImportLiveReportToJson(report: CatalogImportLiveQualityReport): string {
  return JSON.stringify(report, null, 2);
}

export function catalogImportLiveReportToCsv(report: CatalogImportLiveQualityReport): string {
  const headers = [
    "title",
    "brand",
    "model",
    "variant",
    "fuel",
    "transmission",
    "price",
    "city",
    "state",
    "vehicleUrl",
    "sourceId",
    "imageUrls",
  ];
  const lines = [headers.join(",")];
  for (const v of report.vehicles) {
    const images = v.imageUrls?.join(";") ?? v.imageUrl ?? "";
    lines.push(
      [
        v.vehicleTitle,
        v.brand,
        v.model,
        v.variant,
        v.fuel,
        v.transmission,
        v.price,
        v.city,
        v.state,
        v.vehicleUrl,
        v.sourceId,
        images,
      ]
        .map(escapeCsv)
        .join(","),
    );
  }
  return lines.join("\n");
}

export function catalogImportLiveReportToHtml(report: CatalogImportLiveQualityReport): string {
  const s = report.summary;
  const missingRows = Object.entries(s.missingFields)
    .map(([k, n]) => `<tr><td>${escapeHtml(k)}</td><td>${n}</td></tr>`)
    .join("");
  const errorRows = s.errors
    .slice(0, 100)
    .map(
      (e) =>
        `<tr><td>${escapeHtml(e.code)}</td><td>${escapeHtml(e.stage ?? "")}</td><td>${escapeHtml(e.message)}</td></tr>`,
    )
    .join("");
  const vehicleRows = report.vehicles
    .slice(0, 200)
    .map(
      (v) =>
        `<tr><td>${escapeHtml(v.vehicleTitle ?? "")}</td><td>${escapeHtml(v.brand ?? "")}</td><td>${escapeHtml(v.model ?? "")}</td><td>${escapeHtml(v.variant ?? "")}</td><td>${escapeHtml(String(v.price ?? ""))}</td><td>${escapeHtml(v.city ?? "")}</td><td>${escapeHtml(v.vehicleUrl ?? "")}</td></tr>`,
    )
    .join("");

  return `<!doctype html>
<html><head><meta charset="utf-8"/><title>GaadiBazaar Live Dry-Run Quality Report</title>
<style>
body{font-family:Segoe UI,Arial,sans-serif;margin:24px;color:#1a1a1a}
h1,h2{margin:0 0 12px} table{border-collapse:collapse;width:100%;margin:12px 0}
th,td{border:1px solid #ddd;padding:6px 8px;font-size:13px;text-align:left}
th{background:#f5f5f5}.badge{display:inline-block;padding:2px 8px;background:#e8f5e9;border-radius:4px}
.warn{background:#fff3e0}.err{background:#ffebee}
</style></head><body>
<h1>GaadiBazaar Controlled Live Dry-Run</h1>
<p><span class="badge">DRY-RUN</span> <span class="badge warn">NO PUBLISH</span> generated ${escapeHtml(s.generatedAt)}</p>
<section><h2>Summary</h2>
<ul>
<li>Total scraped (cards): ${s.totalScraped}</li>
<li>Successfully parsed: ${s.successfullyParsed}</li>
<li>Validation passed: ${s.validationPassed}</li>
<li>Validation failed: ${s.validationFailed}</li>
<li>Duplicates: ${s.duplicates}</li>
<li>Possible duplicates: ${s.possibleDuplicates}</li>
<li>Matched catalog variants: ${s.matchedCatalogVariants}</li>
<li>Unmatched records: ${s.unmatchedRecords}</li>
<li>Low-confidence matches: ${s.lowConfidenceMatches}</li>
<li>Valid images: ${s.validImages}</li>
<li>Broken images: ${s.brokenImages}</li>
<li>Runtime ms: ${s.runtimeMs}</li>
<li>Errors: ${s.errors.length}</li>
</ul>
<p>Input: city=${escapeHtml(s.input.city ?? "")}, search=${escapeHtml(s.input.search ?? "")}, pages=${s.input.pages ?? 1}, maxVehicles=${s.input.maxVehicles ?? ""}</p>
</section>
<section><h2>Missing fields</h2><table><thead><tr><th>Field</th><th>Count</th></tr></thead><tbody>${missingRows}</tbody></table></section>
<section><h2>Errors</h2><table><thead><tr><th>Code</th><th>Stage</th><th>Message</th></tr></thead><tbody>${errorRows || "<tr><td colspan=3>None</td></tr>"}</tbody></table></section>
<section><h2>Vehicles</h2><table><thead><tr><th>Title</th><th>Brand</th><th>Model</th><th>Variant</th><th>Price</th><th>City</th><th>URL</th></tr></thead><tbody>${vehicleRows}</tbody></table></section>
</body></html>`;
}

export function formatLiveQualitySummaryText(report: CatalogImportLiveQualityReport): string {
  const s = report.summary;
  return [
    "=== GaadiBazaar Phase 5F Controlled Dry-Run ===",
    `Total scraped      : ${s.totalScraped}`,
    `Successfully parsed: ${s.successfullyParsed}`,
    `Validation passed  : ${s.validationPassed}`,
    `Validation failed  : ${s.validationFailed}`,
    `Duplicates         : ${s.duplicates}`,
    `Possible duplicates: ${s.possibleDuplicates}`,
    `Matched variants   : ${s.matchedCatalogVariants}`,
    `Unmatched          : ${s.unmatchedRecords}`,
    `Low-confidence     : ${s.lowConfidenceMatches}`,
    `Valid images       : ${s.validImages}`,
    `Broken images      : ${s.brokenImages}`,
    `Errors             : ${s.errors.length}`,
    `Runtime ms         : ${s.runtimeMs}`,
    "Published          : false (dry-run only)",
  ].join("\n");
}
