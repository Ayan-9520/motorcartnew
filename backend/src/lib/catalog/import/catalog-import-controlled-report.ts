/**
 * Phase 5G controlled real import quality report (CSV / JSON / HTML).
 * Matching ON, media ON, storage gated — never auto-publishes.
 */
import { createCatalogMatchingService } from "../catalog-matching.service";
import type { CatalogMatchResult, CatalogVariantRecord } from "../types";
import { buildCatalogImportPreview } from "./catalog-import-preview.mapper";
import type { CatalogImportJobResult } from "./catalog-import-job.types";
import type { DuplicateDetectionReport, DuplicateRecordResult } from "./duplicate/duplicate-types";
import type { MediaPipelineReport } from "./media/media-types";
import type { ImportRecord, ImportStorageReport } from "./import-types";
import type { CatalogValidationReport } from "./validation/validation-types";
import { importRecordToStandard } from "./validation/catalog-validation.engine";

export type ControlledMatchStatus = "MATCHED" | "MULTIPLE_MATCHES" | "LOW_CONFIDENCE" | "NO_MATCH";

export type ControlledMatchRow = {
  rowNumber: number;
  brand: string;
  model: string;
  variant: string;
  matchStatus: ControlledMatchStatus;
  catalogVariantId: string | null;
  confidence: number;
  matchMethod: string;
  businessKey: string | null;
  reason: string;
};

export type ControlledDuplicateRow = {
  rowNumber: number;
  classification: "DUPLICATE" | "POSSIBLE_DUPLICATE" | "UNIQUE";
  reason: string;
  matchedRows: number[];
  businessKey: string;
};

export type ControlledImportQualitySummary = {
  generatedAt: string;
  dryRun: true;
  published: false;
  scraped: number;
  valid: number;
  invalid: number;
  duplicates: number;
  possibleDuplicates: number;
  matched: number;
  multipleMatches: number;
  lowConfidence: number;
  noMatch: number;
  imagesProcessed: number;
  imagesValid: number;
  imagesFailed: number;
  imageSuccessRate: number;
  mediaErrorCodes: Record<string, number>;
  storageUploaded: number;
  readyForApproval: number;
  failures: number;
  runtimeMs: number;
  storageConfigured: boolean;
  storageError: string | null;
  catalogVariantCount: number;
  input: CatalogImportJobResult["input"];
};

export type ControlledImportQualityReport = {
  summary: ControlledImportQualitySummary;
  matches: ControlledMatchRow[];
  duplicates: ControlledDuplicateRow[];
  previewJobId: string;
  job: CatalogImportJobResult["report"];
};

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

function field(record: ImportRecord, key: string): string {
  const value = record.fields[key];
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function classifyMatch(
  candidates: CatalogMatchResult[],
): { status: ControlledMatchStatus; primary: CatalogMatchResult; reason: string } {
  const primary = candidates[0] ?? {
    catalogVariantId: null,
    businessKey: null,
    confidence: 0 as const,
    method: "none" as const,
  };

  if (primary.method === "none" || primary.confidence <= 0) {
    return {
      status: "NO_MATCH",
      primary,
      reason: "No catalog variant matched — variant will not be auto-created",
    };
  }

  if (candidates.length > 1 && primary.method === "fuzzy") {
    return {
      status: "MULTIPLE_MATCHES",
      primary,
      reason: `${candidates.length} catalog variants tied at fuzzy tier`,
    };
  }

  if (primary.method === "fuzzy" || primary.confidence < 80) {
    return {
      status: "LOW_CONFIDENCE",
      primary,
      reason: `Low-confidence ${primary.method} match (${primary.confidence})`,
    };
  }

  return {
    status: "MATCHED",
    primary,
    reason: `${primary.method} match (confidence ${primary.confidence})`,
  };
}

function buildMatchRows(
  records: ImportRecord[],
  variants: CatalogVariantRecord[],
  pipelineResults: CatalogMatchResult[],
): ControlledMatchRow[] {
  const matcher = variants.length ? createCatalogMatchingService(variants) : null;

  return records.map((record, index) => {
    const standard = importRecordToStandard(record);
    const input = standard
      ? {
          segment: standard.segment,
          brand: standard.brand,
          model: standard.model,
          variant: standard.variant,
          fuel: standard.fuel,
          transmission: standard.transmission,
          modelYear: standard.year,
        }
      : {
          segment: record.segment,
          brand: "",
          model: "",
          variant: "",
          fuel: "",
          transmission: "",
          modelYear: 0,
        };

    const candidates = matcher ? matcher.matchCandidates(input) : [pipelineResults[index]].filter(Boolean);
    const fallback = pipelineResults[index]
      ? [pipelineResults[index]!]
      : [{ catalogVariantId: null, businessKey: null, confidence: 0 as const, method: "none" as const }];
    const classified = classifyMatch(candidates.length ? candidates : fallback);

    return {
      rowNumber: record.rowNumber,
      brand: field(record, "brand"),
      model: field(record, "model"),
      variant: field(record, "variant"),
      matchStatus: classified.status,
      catalogVariantId: classified.primary.catalogVariantId,
      confidence: classified.primary.confidence,
      matchMethod: classified.primary.method,
      businessKey: classified.primary.businessKey,
      reason: classified.reason,
    };
  });
}

function buildDuplicateRows(report: DuplicateDetectionReport | undefined): ControlledDuplicateRow[] {
  if (!report?.results) return [];
  const groupRows = new Map<string, number[]>();
  for (const group of report.groups ?? []) {
    groupRows.set(group.groupId, group.rowNumbers);
  }

  return report.results.map((item: DuplicateRecordResult) => {
    const matched = new Set<number>();
    for (const groupId of item.groupIds ?? []) {
      for (const row of groupRows.get(groupId) ?? []) {
        if (row !== item.rowNumber) matched.add(row);
      }
    }
    return {
      rowNumber: item.rowNumber,
      classification: item.classification,
      reason:
        (item.matchedSignals?.length ?? 0) > 0
          ? `${item.classification}: ${item.matchedSignals.join(", ")}`
          : item.classification,
      matchedRows: [...matched].sort((a, b) => a - b),
      businessKey: item.businessKey,
    };
  });
}

export function buildControlledImportQualityReport(options: {
  result: CatalogImportJobResult;
  catalogVariants: CatalogVariantRecord[];
  storageConfigured: boolean;
  storageError: string | null;
  runtimeMs?: number;
}): ControlledImportQualityReport {
  const { result, catalogVariants } = options;
  const context = result.pipeline?.context;
  const validation = context?.metadata.catalogValidationReport as CatalogValidationReport | undefined;
  const duplicates = context?.metadata.catalogDuplicateReport as DuplicateDetectionReport | undefined;
  const media = context?.media as MediaPipelineReport | undefined;
  const storage = context?.storage as ImportStorageReport | undefined;
  const matchResults = context?.matching?.results ?? [];

  const records: ImportRecord[] = context?.normalizedRecords?.length
    ? [...context.normalizedRecords]
    : [...(context?.records ?? [])];

  const matches = buildMatchRows(records, catalogVariants, matchResults);
  const duplicateRows = buildDuplicateRows(duplicates);

  const preview = buildCatalogImportPreview(result.jobId, result);
  const readyForApproval = preview.records.filter(
    (r) => r.validationErrors.length === 0 && r.status !== "duplicate",
  ).length;

  const imagesProcessed = media?.summary.totalItems ?? 0;
  const imagesFailed =
    (media?.summary.brokenUrlCount ?? 0) +
    (media?.summary.invalidImageCount ?? 0) +
    (media?.summary.unsupportedFormatCount ?? 0);
  const imagesValid = media?.summary.validImageCount ?? 0;
  const mediaErrorCodes: Record<string, number> = {};
  for (const item of media?.items ?? []) {
    if (item.errorCode) {
      mediaErrorCodes[item.errorCode] = (mediaErrorCodes[item.errorCode] ?? 0) + 1;
    } else if (item.category !== "valid_image" && item.category !== "valid_brochure" && item.category !== "valid_video") {
      mediaErrorCodes[item.category] = (mediaErrorCodes[item.category] ?? 0) + 1;
    }
  }

  const summary: ControlledImportQualitySummary = {
    generatedAt: new Date().toISOString(),
    dryRun: true,
    published: false,
    scraped: result.report.scrapeStats?.vehicleCardsSeen ?? result.payload?.vehicles.length ?? 0,
    valid: validation?.summary.validCount ?? preview.summary.valid,
    invalid: validation?.summary.rejectedCount ?? preview.summary.rejected,
    duplicates: duplicates?.summary.duplicateCount ?? 0,
    possibleDuplicates: duplicates?.summary.possibleDuplicateCount ?? 0,
    matched: matches.filter((m) => m.matchStatus === "MATCHED").length,
    multipleMatches: matches.filter((m) => m.matchStatus === "MULTIPLE_MATCHES").length,
    lowConfidence: matches.filter((m) => m.matchStatus === "LOW_CONFIDENCE").length,
    noMatch: matches.filter((m) => m.matchStatus === "NO_MATCH").length,
    imagesProcessed,
    imagesValid,
    imagesFailed,
    imageSuccessRate:
      imagesProcessed > 0 ? Math.round((imagesValid / imagesProcessed) * 1000) / 10 : 0,
    mediaErrorCodes,
    storageUploaded: storage?.uploadedCount ?? 0,
    readyForApproval,
    failures: result.report.errorSummary.totalErrors + (options.storageError ? 1 : 0),
    runtimeMs: options.runtimeMs ?? result.report.performance.totalDurationMs,
    storageConfigured: options.storageConfigured,
    storageError: options.storageError,
    catalogVariantCount: catalogVariants.length,
    input: {
      ...result.input,
      // Avoid dumping full catalog index into the report payload.
      catalogVariants: undefined,
      catalogVariantCount: catalogVariants.length,
    } as CatalogImportJobResult["input"] & { catalogVariantCount?: number },
  };

  return {
    summary,
    matches,
    duplicates: duplicateRows,
    previewJobId: result.jobId,
    job: result.report,
  };
}

export function controlledImportReportToJson(report: ControlledImportQualityReport): string {
  return JSON.stringify(report, null, 2);
}

export function controlledImportReportToCsv(report: ControlledImportQualityReport): string {
  const headers = [
    "rowNumber",
    "brand",
    "model",
    "variant",
    "matchStatus",
    "catalogVariantId",
    "confidence",
    "matchMethod",
    "businessKey",
    "matchReason",
    "duplicateClassification",
    "duplicateReason",
    "matchedDuplicateRows",
  ];
  const dupByRow = new Map(report.duplicates.map((d) => [d.rowNumber, d]));
  const lines = [headers.join(",")];
  for (const m of report.matches) {
    const d = dupByRow.get(m.rowNumber);
    lines.push(
      [
        m.rowNumber,
        m.brand,
        m.model,
        m.variant,
        m.matchStatus,
        m.catalogVariantId,
        m.confidence,
        m.matchMethod,
        m.businessKey,
        m.reason,
        d?.classification ?? "",
        d?.reason ?? "",
        d?.matchedRows.join(";") ?? "",
      ]
        .map(escapeCsv)
        .join(","),
    );
  }
  return lines.join("\n");
}

export function controlledImportReportToHtml(report: ControlledImportQualityReport): string {
  const s = report.summary;
  const matchRows = report.matches
    .slice(0, 200)
    .map(
      (m) =>
        `<tr><td>${m.rowNumber}</td><td>${escapeHtml(m.brand)}</td><td>${escapeHtml(m.model)}</td><td>${escapeHtml(m.variant)}</td><td>${escapeHtml(m.matchStatus)}</td><td>${m.confidence}</td><td>${escapeHtml(m.matchMethod)}</td><td>${escapeHtml(m.catalogVariantId ?? "")}</td><td>${escapeHtml(m.reason)}</td></tr>`,
    )
    .join("");

  const storageBanner = s.storageConfigured
    ? `<p class="badge">Storage configured — uploads via ${escapeHtml(String(report.job.importSummary ? "configured provider" : "provider"))}</p>`
    : `<p class="badge err">STORAGE CONFIG ERROR: ${escapeHtml(s.storageError ?? "missing")}</p>`;

  return `<!doctype html>
<html><head><meta charset="utf-8"/><title>Phase 5G Controlled Import Report</title>
<style>
body{font-family:Segoe UI,Arial,sans-serif;margin:24px;color:#1a1a1a}
table{border-collapse:collapse;width:100%;margin:12px 0}th,td{border:1px solid #ddd;padding:6px 8px;font-size:13px;text-align:left}
th{background:#f5f5f5}.badge{display:inline-block;padding:4px 10px;background:#e8f5e9;border-radius:4px;margin-right:8px}
.err{background:#ffebee}.warn{background:#fff3e0}
</style></head><body>
<h1>Phase 5G — Controlled Real Import</h1>
<p><span class="badge">DRY-RUN</span><span class="badge warn">NO AUTO-PUBLISH</span><span class="badge">Admin approval required</span></p>
${storageBanner}
<section><h2>Summary</h2>
<ul>
<li>Scraped: ${s.scraped}</li>
<li>Valid: ${s.valid}</li>
<li>Invalid: ${s.invalid}</li>
<li>Duplicates: ${s.duplicates}</li>
<li>Possible duplicates: ${s.possibleDuplicates}</li>
<li>Matched: ${s.matched}</li>
<li>Multiple matches: ${s.multipleMatches}</li>
<li>Low confidence: ${s.lowConfidence}</li>
<li>No match: ${s.noMatch}</li>
<li>Images processed: ${s.imagesProcessed}</li>
<li>Images failed: ${s.imagesFailed}</li>
<li>Storage uploaded: ${s.storageUploaded}</li>
<li>Ready for approval: ${s.readyForApproval}</li>
<li>Failures: ${s.failures}</li>
<li>Runtime ms: ${s.runtimeMs}</li>
<li>Catalog variants loaded: ${s.catalogVariantCount}</li>
<li>Preview job id: ${escapeHtml(report.previewJobId)}</li>
</ul></section>
<section><h2>Matches</h2>
<table><thead><tr><th>Row</th><th>Brand</th><th>Model</th><th>Variant</th><th>Status</th><th>Confidence</th><th>Method</th><th>Catalog ID</th><th>Reason</th></tr></thead>
<tbody>${matchRows || "<tr><td colspan=9>None</td></tr>"}</tbody></table>
</section>
</body></html>`;
}

export function formatControlledImportSummaryText(report: ControlledImportQualityReport): string {
  const s = report.summary;
  return [
    "=== GaadiBazaar Phase 5G Controlled Import ===",
    `Scraped              : ${s.scraped}`,
    `Valid                : ${s.valid}`,
    `Invalid              : ${s.invalid}`,
    `Duplicates           : ${s.duplicates}`,
    `Possible duplicates  : ${s.possibleDuplicates}`,
    `Matched              : ${s.matched}`,
    `Multiple matches     : ${s.multipleMatches}`,
    `Low confidence       : ${s.lowConfidence}`,
    `No match             : ${s.noMatch}`,
    `Images processed     : ${s.imagesProcessed}`,
    `Images valid         : ${s.imagesValid}`,
    `Images failed        : ${s.imagesFailed}`,
    `Image success rate   : ${s.imageSuccessRate}%`,
    Object.keys(s.mediaErrorCodes).length
      ? `Media error codes    : ${Object.entries(s.mediaErrorCodes)
          .map(([k, n]) => `${k}=${n}`)
          .join(", ")}`
      : null,
    `Storage uploaded     : ${s.storageUploaded}`,
    `Ready for approval   : ${s.readyForApproval}`,
    `Failures             : ${s.failures}`,
    `Runtime ms           : ${s.runtimeMs}`,
    `Storage configured   : ${s.storageConfigured}`,
    s.storageError ? `Storage error        : ${s.storageError}` : null,
    "Published            : false (admin approval required)",
  ]
    .filter(Boolean)
    .join("\n");
}
