import type { CatalogImportSegment } from "./catalog-segment";
import { resolveCatalogImportSegment } from "./catalog-segment";
import type { ImportRecord } from "./import-types";
import {
  buildStandardRecord,
  standardRecordToImportFields,
  trimCell,
} from "./parser/value-normalizer";
import type { StandardCatalogField, StandardCatalogImportRecord } from "./parser/parser-types";

const STANDARD_FIELD_KEYS: StandardCatalogField[] = [
  "brand",
  "model",
  "variant",
  "fuel",
  "transmission",
  "year",
  "bodyType",
  "color",
  "exShowroomPrice",
  "onRoadPrice",
  "city",
  "state",
  "imageUrl",
  "brochureUrl",
  "description",
  "features",
];

export function resolveRecordSegment(record: ImportRecord, payloadSegment?: unknown): CatalogImportSegment {
  return resolveCatalogImportSegment(
    record.segment,
    record.fields.segment,
    payloadSegment,
  );
}

export function importRecordToFieldValues(record: ImportRecord): Partial<Record<StandardCatalogField, string>> {
  const values: Partial<Record<StandardCatalogField, string>> = {};
  for (const key of STANDARD_FIELD_KEYS) {
    const raw = record.fields[key];
    if (raw === null || raw === undefined || raw === "") continue;
    values[key] = trimCell(raw);
  }
  return values;
}

export type NormalizedImportRecordResult = {
  standard?: StandardCatalogImportRecord;
  importRecord?: ImportRecord;
  issues: string[];
};

/** Single normalization path for all import sources (Phase 3B buildStandardRecord). */
export function normalizeImportRecord(
  record: ImportRecord,
  payloadSegment?: unknown,
): NormalizedImportRecordResult {
  const segment = resolveRecordSegment(record, payloadSegment);
  const fieldValues = importRecordToFieldValues(record);
  const { record: standard, issues } = buildStandardRecord(record.rowNumber, fieldValues, segment);

  if (!standard) {
    return { issues };
  }

  const fields = standardRecordToImportFields(standard);
  for (const [key, value] of Object.entries(record.fields)) {
    if (STANDARD_FIELD_KEYS.includes(key as StandardCatalogField)) continue;
    if (key === "segment") continue;
    fields[key] = value;
  }

  return {
    standard,
    importRecord: {
      rowNumber: record.rowNumber,
      segment: standard.segment,
      fields,
      raw: record.raw,
    },
    issues,
  };
}

export function normalizeImportRecords(
  records: ImportRecord[],
  payloadSegment?: unknown,
): ImportRecord[] {
  return records
    .map((record) => normalizeImportRecord(record, payloadSegment))
    .filter((r) => r.importRecord)
    .map((r) => r.importRecord!);
}

/** Canonical conversion used by validation, duplicate, media, and matching. */
export function importRecordToStandard(record: ImportRecord, payloadSegment?: unknown): StandardCatalogImportRecord | null {
  return normalizeImportRecord(record, payloadSegment).standard ?? null;
}

export function standardToImportRecord(standard: StandardCatalogImportRecord, extras?: Record<string, unknown>): ImportRecord {
  const fields = standardRecordToImportFields(standard);
  if (extras) {
    for (const [key, value] of Object.entries(extras)) {
      if (value === undefined) continue;
      fields[key] = value as string | number | boolean | null;
    }
  }
  return {
    rowNumber: standard.rowNumber,
    segment: standard.segment,
    fields,
    raw: standard,
  };
}
