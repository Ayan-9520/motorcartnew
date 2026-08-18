import type { CatalogValidationConfig, CatalogValidationIssue } from "./validation-types";
import { slugifyGeoToken } from "./validation-config";
import type { StandardCatalogImportRecord } from "../parser/parser-types";

const BRAND_SLUG_PATTERN = /^[a-z0-9-]+$/;
const MODEL_SLUG_PATTERN = /^[a-z0-9-]+$/;

function issue(
  code: string,
  message: string,
  field: CatalogValidationIssue["field"],
  rowNumber: number,
  severity: CatalogValidationIssue["severity"],
): CatalogValidationIssue {
  return { code, message, field, rowNumber, severity };
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateBrand(
  record: StandardCatalogImportRecord,
  config: CatalogValidationConfig,
): CatalogValidationIssue[] {
  const issues: CatalogValidationIssue[] = [];
  const { brand, rowNumber } = record;

  if (!brand?.trim()) {
    issues.push(issue("BRAND_EMPTY", "Brand is required", "brand", rowNumber, "error"));
    return issues;
  }

  if (!BRAND_SLUG_PATTERN.test(brand)) {
    issues.push(
      issue("BRAND_INVALID_CHARS", "Brand contains invalid characters", "brand", rowNumber, "error"),
    );
  }

  if (!config.knownBrandSlugs.has(brand)) {
    issues.push(
      issue(
        "BRAND_UNKNOWN",
        `Brand "${brand}" is not in the known brand list`,
        "brand",
        rowNumber,
        config.warnUnknownBrand ? "warning" : "error",
      ),
    );
  }

  return issues;
}

export function validateModel(record: StandardCatalogImportRecord): CatalogValidationIssue[] {
  const issues: CatalogValidationIssue[] = [];
  const { model, rowNumber } = record;

  if (!model?.trim()) {
    issues.push(issue("MODEL_EMPTY", "Model is required", "model", rowNumber, "error"));
    return issues;
  }

  if (!MODEL_SLUG_PATTERN.test(model)) {
    issues.push(issue("MODEL_INVALID", "Model contains invalid characters", "model", rowNumber, "error"));
  }

  return issues;
}

export function validateVariant(record: StandardCatalogImportRecord): CatalogValidationIssue[] {
  if (!record.variant?.trim()) {
    return [issue("VARIANT_EMPTY", "Variant is required", "variant", record.rowNumber, "error")];
  }
  return [];
}

export function validateFuel(record: StandardCatalogImportRecord, config: CatalogValidationConfig): CatalogValidationIssue[] {
  const { fuel, rowNumber } = record;
  if (!fuel?.trim()) {
    return [issue("FUEL_EMPTY", "Fuel is required", "fuel", rowNumber, "error")];
  }
  if (!config.allowedFuelSlugs.has(fuel.toLowerCase())) {
    return [
      issue(
        "FUEL_NOT_ALLOWED",
        `Fuel "${fuel}" is not an allowed value`,
        "fuel",
        rowNumber,
        "error",
      ),
    ];
  }
  return [];
}

export function validateTransmission(
  record: StandardCatalogImportRecord,
  config: CatalogValidationConfig,
): CatalogValidationIssue[] {
  const { transmission, rowNumber } = record;
  if (!transmission?.trim()) {
    return [issue("TRANSMISSION_EMPTY", "Transmission is required", "transmission", rowNumber, "error")];
  }
  if (!config.allowedTransmissionSlugs.has(transmission.toLowerCase())) {
    return [
      issue(
        "TRANSMISSION_NOT_ALLOWED",
        `Transmission "${transmission}" is not an allowed value`,
        "transmission",
        rowNumber,
        "error",
      ),
    ];
  }
  return [];
}

export function validateYear(record: StandardCatalogImportRecord, config: CatalogValidationConfig): CatalogValidationIssue[] {
  const { year, rowNumber } = record;
  if (!Number.isFinite(year)) {
    return [issue("YEAR_INVALID", "Year is required and must be numeric", "year", rowNumber, "error")];
  }
  if (year < config.minYear || year > config.maxYear) {
    return [
      issue(
        "YEAR_OUT_OF_RANGE",
        `Year ${year} is outside allowed range ${config.minYear}-${config.maxYear}`,
        "year",
        rowNumber,
        "error",
      ),
    ];
  }
  return [];
}

export function validatePriceField(
  value: number | null,
  field: "exShowroomPrice" | "onRoadPrice",
  rowNumber: number,
): CatalogValidationIssue[] {
  if (value === null || value === undefined) return [];
  if (!Number.isFinite(value) || value <= 0) {
    return [
      issue(
        "PRICE_INVALID",
        `${field === "exShowroomPrice" ? "Ex showroom price" : "On road price"} must be a positive number`,
        field,
        rowNumber,
        "error",
      ),
    ];
  }
  return [];
}

export function validateCity(record: StandardCatalogImportRecord, config: CatalogValidationConfig): CatalogValidationIssue[] {
  if (!record.city?.trim()) return [];
  const slug = slugifyGeoToken(record.city);
  const lower = record.city.trim().toLowerCase();
  if (!config.knownCitySlugs.has(slug) && !config.knownCityNames.has(lower)) {
    return [
      issue(
        "CITY_UNKNOWN",
        `City "${record.city}" is not in the known city list`,
        "city",
        record.rowNumber,
        config.warnUnknownGeo ? "warning" : "error",
      ),
    ];
  }
  return [];
}

export function validateState(record: StandardCatalogImportRecord, config: CatalogValidationConfig): CatalogValidationIssue[] {
  if (!record.state?.trim()) return [];
  const slug = slugifyGeoToken(record.state);
  const lower = record.state.trim().toLowerCase();
  if (!config.knownStateSlugs.has(slug) && !config.knownStateNames.has(lower)) {
    return [
      issue(
        "STATE_UNKNOWN",
        `State "${record.state}" is not in the known state list`,
        "state",
        record.rowNumber,
        config.warnUnknownGeo ? "warning" : "error",
      ),
    ];
  }
  return [];
}

export function validateUrlField(
  value: string | null,
  field: "imageUrl" | "brochureUrl",
  rowNumber: number,
): CatalogValidationIssue[] {
  if (!value?.trim()) return [];
  if (!isValidHttpUrl(value.trim())) {
    return [
      issue(
        "URL_INVALID",
        `${field === "imageUrl" ? "Image URL" : "Brochure URL"} is not a valid http(s) URL`,
        field,
        rowNumber,
        "error",
      ),
    ];
  }
  return [];
}

export function validateRecordRow(
  record: StandardCatalogImportRecord,
  config: CatalogValidationConfig,
): CatalogValidationIssue[] {
  return [
    ...validateBrand(record, config),
    ...validateModel(record),
    ...validateVariant(record),
    ...validateFuel(record, config),
    ...validateTransmission(record, config),
    ...validateYear(record, config),
    ...validatePriceField(record.exShowroomPrice, "exShowroomPrice", record.rowNumber),
    ...validatePriceField(record.onRoadPrice, "onRoadPrice", record.rowNumber),
    ...validateCity(record, config),
    ...validateState(record, config),
    ...validateUrlField(record.imageUrl, "imageUrl", record.rowNumber),
    ...validateUrlField(record.brochureUrl, "brochureUrl", record.rowNumber),
  ];
}
