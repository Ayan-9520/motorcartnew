/** Catalog import segment (aligned with Prisma CatalogSegment). */

export const CATALOG_IMPORT_SEGMENTS = [
  "car",
  "bike",
  "scooter",
  "ev",
  "truck",
  "bus",
  "pickup",
  "tractor",
  "construction_equipment",
  "farm_equipment",
  "commercial_vehicle",
  "auto",
] as const;

export type CatalogImportSegment = (typeof CATALOG_IMPORT_SEGMENTS)[number];

const SEGMENT_SET = new Set<string>(CATALOG_IMPORT_SEGMENTS);

/** Used only when segment cannot be inferred from the record or payload. */
export const DEFAULT_CATALOG_IMPORT_SEGMENT: CatalogImportSegment = "car";

export function isCatalogImportSegment(value: string): value is CatalogImportSegment {
  return SEGMENT_SET.has(value);
}

export function normalizeCatalogImportSegment(value: unknown): CatalogImportSegment | null {
  if (value === null || value === undefined) return null;
  const slug = String(value).trim().toLowerCase().replace(/\s+/g, "_");
  if (!slug) return null;
  return isCatalogImportSegment(slug) ? slug : null;
}

export function resolveCatalogImportSegment(
  ...candidates: Array<unknown>
): CatalogImportSegment {
  for (const candidate of candidates) {
    const normalized = normalizeCatalogImportSegment(candidate);
    if (normalized) return normalized;
  }
  return DEFAULT_CATALOG_IMPORT_SEGMENT;
}
