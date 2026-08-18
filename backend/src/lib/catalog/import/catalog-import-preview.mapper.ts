import type { CatalogMatchResult } from "../types";
import type { CatalogImportJobResult } from "./catalog-import-job.types";
import type { DuplicateDetectionReport } from "./duplicate/duplicate-types";
import type { ImportRecord } from "./import-types";
import type { CatalogValidationReport } from "./validation/validation-types";
import type {
  CatalogImportPreviewPayload,
  CatalogImportPreviewRecord,
  CatalogImportPreviewStatus,
  CatalogImportPreviewSummary,
} from "./catalog-import-preview.types";

/** Align with import-pipeline approval thresholds (read-only classification). */
const NEED_REVIEW_MAX_EXCLUSIVE = 80;
const REJECT_MAX_INCLUSIVE = 0;

function fieldString(record: ImportRecord, key: string): string {
  const value = record.fields[key];
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function resolveImageUrl(record: ImportRecord): string | null {
  const primary = fieldString(record, "imageUrl");
  if (primary) return primary;
  const images = fieldString(record, "images");
  if (images) {
    const first = images.split("|").map((part) => part.trim()).find(Boolean);
    if (first) return first;
  }
  return null;
}

function resolvePrice(record: ImportRecord): string | null {
  const price =
    fieldString(record, "exShowroomPrice") ||
    fieldString(record, "price") ||
    fieldString(record, "onRoadPrice");
  return price || null;
}

function classifyStatus(options: {
  hasValidationErrors: boolean;
  duplicateClassification: string | null;
  matchingChecked: boolean;
  confidence: number | null;
}): CatalogImportPreviewStatus {
  if (options.hasValidationErrors) return "rejected";
  if (options.duplicateClassification === "DUPLICATE") return "duplicate";
  if (options.duplicateClassification === "POSSIBLE_DUPLICATE") return "need_review";

  if (options.matchingChecked && options.confidence !== null) {
    if (options.confidence <= REJECT_MAX_INCLUSIVE) return "rejected";
    if (options.confidence < NEED_REVIEW_MAX_EXCLUSIVE) return "need_review";
  }

  return "valid";
}

function duplicateReasonFrom(
  classification: string | null,
  signals: string[],
): string | null {
  if (!classification || classification === "UNIQUE") return null;
  if (signals.length === 0) return classification.replaceAll("_", " ").toLowerCase();
  return `${classification.replaceAll("_", " ").toLowerCase()}: ${signals.join(", ")}`;
}

function buildSummary(records: CatalogImportPreviewRecord[]): CatalogImportPreviewSummary {
  return {
    totalRecords: records.length,
    valid: records.filter((r) => r.status === "valid").length,
    duplicate: records.filter((r) => r.status === "duplicate").length,
    needReview: records.filter((r) => r.status === "need_review").length,
    rejected: records.filter((r) => r.status === "rejected").length,
  };
}

/**
 * Build read-only preview from stored job result (no pipeline / DB changes).
 */
export function buildCatalogImportPreview(
  jobId: string,
  result: CatalogImportJobResult,
): CatalogImportPreviewPayload {
  const context = result.pipeline?.context;
  const validation = context?.metadata.catalogValidationReport as CatalogValidationReport | undefined;
  const duplicates = context?.metadata.catalogDuplicateReport as DuplicateDetectionReport | undefined;
  const matchingChecked = Boolean(context?.matching?.checked);
  const matchResults = context?.matching?.results ?? [];

  const validationErrorsByRow = new Map<number, string[]>();
  for (const issue of validation?.errors ?? []) {
    const list = validationErrorsByRow.get(issue.rowNumber) ?? [];
    list.push(`${issue.field}: ${issue.message}`);
    validationErrorsByRow.set(issue.rowNumber, list);
  }
  for (const rejected of validation?.rejectedRecords ?? []) {
    const list = validationErrorsByRow.get(rejected.rowNumber) ?? [];
    for (const error of rejected.errors) {
      list.push(`${error.field}: ${error.message}`);
    }
    validationErrorsByRow.set(rejected.rowNumber, [...new Set(list)]);
  }

  const duplicateByRow = new Map<
    number,
    { classification: string; signals: string[] }
  >();
  for (const item of duplicates?.results ?? []) {
    duplicateByRow.set(item.rowNumber, {
      classification: item.classification,
      signals: item.matchedSignals,
    });
  }

  const sourceRecords: ImportRecord[] = [];
  const seenRows = new Set<number>();

  const normalized = context?.normalizedRecords?.length
    ? [...context.normalizedRecords]
    : [...(context?.records ?? [])];

  for (const record of normalized) {
    sourceRecords.push(record);
    seenRows.add(record.rowNumber);
  }

  for (const rejected of validation?.rejectedRecords ?? []) {
    if (seenRows.has(rejected.rowNumber)) continue;
    sourceRecords.push({
      rowNumber: rejected.rowNumber,
      segment: (rejected.record.segment as ImportRecord["segment"]) ?? "car",
      fields: {
        brand: rejected.record.brand ?? "",
        model: rejected.record.model ?? "",
        variant: rejected.record.variant ?? "",
        fuel: rejected.record.fuel ?? "",
        transmission: rejected.record.transmission ?? "",
        city: rejected.record.city ?? "",
        imageUrl: rejected.record.imageUrl ?? "",
        exShowroomPrice: rejected.record.exShowroomPrice ?? null,
      },
    });
    seenRows.add(rejected.rowNumber);
  }

  const records: CatalogImportPreviewRecord[] = sourceRecords.map((record, index) => {
    const match: CatalogMatchResult | undefined = matchResults[index];
    const dup = duplicateByRow.get(record.rowNumber) ?? null;
    const validationErrors = validationErrorsByRow.get(record.rowNumber) ?? [];
    const confidence = matchingChecked ? (match?.confidence ?? 0) : null;
    const status = classifyStatus({
      hasValidationErrors: validationErrors.length > 0,
      duplicateClassification: dup?.classification ?? null,
      matchingChecked,
      confidence,
    });

    return {
      id: `${jobId}-row-${record.rowNumber}`,
      rowNumber: record.rowNumber,
      status,
      imageUrl: resolveImageUrl(record),
      brand: fieldString(record, "brand") || "—",
      model: fieldString(record, "model") || "—",
      variant: fieldString(record, "variant") || "—",
      fuel: fieldString(record, "fuel") || "—",
      transmission: fieldString(record, "transmission") || "—",
      price: resolvePrice(record),
      city: fieldString(record, "city") || "—",
      matchConfidence: confidence,
      matchMethod: matchingChecked ? (match?.method ?? "none") : null,
      duplicateReason: duplicateReasonFrom(dup?.classification ?? null, dup?.signals ?? []),
      validationErrors,
    };
  });

  records.sort((a, b) => a.rowNumber - b.rowNumber);

  return {
    dryRun: true,
    published: false,
    jobId,
    generatedAt: new Date().toISOString(),
    summary: buildSummary(records),
    records,
  };
}
