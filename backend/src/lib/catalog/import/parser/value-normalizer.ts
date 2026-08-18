import {
  DEFAULT_NORMALIZATION_CONFIG,
  normalizeBrandLabel,
  normalizeFuelValue,
  normalizeTransmissionValue,
  normalizeVariantLabel,
  slugifyCatalogToken,
} from "../../normalization";
import type { CatalogImportSegment } from "../catalog-segment";
import { DEFAULT_CATALOG_IMPORT_SEGMENT } from "../catalog-segment";
import type { StandardCatalogField, StandardCatalogImportRecord } from "./parser-types";

export function trimCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function parsePrice(value: unknown): number | null {
  const raw = trimCell(value);
  if (!raw) return null;
  const cleaned = raw.replace(/[,₹$€£\s]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

export function parseYear(value: unknown): number | null {
  const raw = trimCell(value);
  if (!raw) return null;
  const num = Number.parseInt(raw, 10);
  if (!Number.isFinite(num) || num < 1900 || num > 2100) return null;
  return num;
}

export function parseFeatures(value: unknown): string[] {
  const raw = trimCell(value);
  if (!raw) return [];
  if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean);
    } catch {
      /* fall through */
    }
  }
  return raw
    .split(/[|;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function normalizeBrand(value: string): string {
  const normalized = normalizeBrandLabel(value, DEFAULT_NORMALIZATION_CONFIG);
  return slugifyCatalogToken(normalized) || normalized.toLowerCase();
}

export function normalizeModel(value: string): string {
  return slugifyCatalogToken(value);
}

export function normalizeVariant(value: string): string {
  const label = normalizeVariantLabel(value, DEFAULT_NORMALIZATION_CONFIG);
  return label || slugifyCatalogToken(value);
}

export function normalizeFuel(value: string): string {
  return normalizeFuelValue(value, DEFAULT_NORMALIZATION_CONFIG);
}

export function normalizeTransmission(value: string): string {
  return normalizeTransmissionValue(value, DEFAULT_NORMALIZATION_CONFIG);
}

export function normalizeOptionalText(value: unknown): string | null {
  const text = trimCell(value);
  return text || null;
}

export function normalizeOptionalUrl(value: unknown): string | null {
  const text = trimCell(value);
  if (!text) return null;
  return text;
}

export function buildStandardRecord(
  rowNumber: number,
  values: Partial<Record<StandardCatalogField, string>>,
  segment: CatalogImportSegment = DEFAULT_CATALOG_IMPORT_SEGMENT,
): { record?: StandardCatalogImportRecord; issues: string[] } {
  const issues: string[] = [];

  const brandRaw = values.brand ?? "";
  const modelRaw = values.model ?? "";
  const variantRaw = values.variant ?? "";
  const fuelRaw = values.fuel ?? "";
  const transmissionRaw = values.transmission ?? "";
  const yearRaw = values.year ?? "";

  if (!brandRaw) issues.push("Missing brand");
  if (!modelRaw) issues.push("Missing model");
  if (!variantRaw) issues.push("Missing variant");
  if (!fuelRaw) issues.push("Missing fuel");
  if (!transmissionRaw) issues.push("Missing transmission");
  if (!yearRaw) issues.push("Missing year");

  const year = parseYear(yearRaw);
  if (yearRaw && year === null) issues.push("Invalid year");

  if (issues.length > 0) {
    return { issues };
  }

  return {
    record: {
      rowNumber,
      segment,
      brand: normalizeBrand(brandRaw),
      model: normalizeModel(modelRaw),
      variant: normalizeVariant(variantRaw),
      fuel: normalizeFuel(fuelRaw),
      transmission: normalizeTransmission(transmissionRaw),
      year: year!,
      bodyType: normalizeOptionalText(values.bodyType),
      color: normalizeOptionalText(values.color),
      exShowroomPrice: parsePrice(values.exShowroomPrice),
      onRoadPrice: parsePrice(values.onRoadPrice),
      city: normalizeOptionalText(values.city),
      state: normalizeOptionalText(values.state),
      imageUrl: normalizeOptionalUrl(values.imageUrl),
      brochureUrl: normalizeOptionalUrl(values.brochureUrl),
      description: normalizeOptionalText(values.description),
      features: parseFeatures(values.features),
    },
    issues: [],
  };
}

export function standardRecordToImportFields(record: StandardCatalogImportRecord): Record<string, string | number | boolean | null> {
  return {
    segment: record.segment,
    brand: record.brand,
    model: record.model,
    variant: record.variant,
    fuel: record.fuel,
    transmission: record.transmission,
    year: record.year,
    bodyType: record.bodyType,
    color: record.color,
    exShowroomPrice: record.exShowroomPrice,
    onRoadPrice: record.onRoadPrice,
    city: record.city,
    state: record.state,
    imageUrl: record.imageUrl,
    brochureUrl: record.brochureUrl,
    description: record.description,
    features: record.features.join("|"),
  };
}
