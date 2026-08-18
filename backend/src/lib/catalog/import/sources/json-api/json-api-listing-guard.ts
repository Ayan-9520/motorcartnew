import { LISTING_SHAPED_FIELD_KEYS } from "./json-api-types";

function normalizeKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ");
}

const FORBIDDEN = new Set(
  LISTING_SHAPED_FIELD_KEYS.map((k) => normalizeKey(k)),
);

/** Returns the first forbidden listing-shaped field name found, or null. */
export function findListingShapedField(value: unknown, path = "root"): string | null {
  if (value === null || value === undefined) return null;

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const hit = findListingShapedField(value[i], `${path}[${i}]`);
      if (hit) return hit;
    }
    return null;
  }

  if (typeof value !== "object") return null;

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const normalized = normalizeKey(key);
    if (FORBIDDEN.has(normalized) || FORBIDDEN.has(normalized.replace(/\s+/g, ""))) {
      return `${path}.${key}`;
    }
    // Also match compacted forms (kmDriven → kmdriven)
    const compact = key.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (
      compact === "kmdriven" ||
      compact === "kmsdriven" ||
      compact === "ownership" ||
      compact === "dealerprice" ||
      compact === "discount" ||
      compact === "registrationstate"
    ) {
      return `${path}.${key}`;
    }
    const nested = findListingShapedField(child, `${path}.${key}`);
    if (nested) return nested;
  }

  return null;
}

export function isListingShapedPayload(value: unknown): {
  rejected: boolean;
  fieldPath: string | null;
} {
  const fieldPath = findListingShapedField(value);
  return { rejected: fieldPath !== null, fieldPath };
}
