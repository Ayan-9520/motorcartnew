import {
  buildStandardRecord,
  standardRecordToImportFields,
  trimCell,
} from "../../parser/value-normalizer";
import type { StandardCatalogImportRecord } from "../../parser/parser-types";
import type { ImportRecord } from "../../import-types";
import { normalizeImportRecord } from "../../import-record-normalizer";
import {
  normalizeCatalogImportSegment,
  resolveCatalogImportSegment,
  type CatalogImportSegment,
} from "../../catalog-segment";
import type { GaadiBazaarScrapedVehicle, GaadiBazaarScraperPayload } from "./gaadi-bazaar-types";

function currentModelYear(): number {
  return new Date().getFullYear();
}

function joinImageUrls(vehicle: GaadiBazaarScrapedVehicle): { primary: string; gallery: string } {
  const urls = [
    ...(vehicle.imageUrls ?? []),
    ...(vehicle.imageUrl ? [vehicle.imageUrl] : []),
  ]
    .map((u) => trimCell(u))
    .filter(Boolean);

  const unique = [...new Set(urls)];
  const primary = unique[0] ?? "";
  const gallery = unique.slice(1).join("|");
  return { primary, gallery };
}

function resolveSourceId(vehicle: GaadiBazaarScrapedVehicle): string {
  if (vehicle.sourceId?.trim()) return vehicle.sourceId.trim();
  if (vehicle.vehicleUrl?.trim()) return vehicle.vehicleUrl.trim();
  return "";
}

/** Map one scraped GaadiBazaar vehicle to raw import field values (normalization deferred to pipeline). */
export function gaadiBazaarVehicleToFieldValues(
  vehicle: GaadiBazaarScrapedVehicle,
): Partial<Record<import("../../parser/parser-types").StandardCatalogField, string>> {
  const { primary } = joinImageUrls(vehicle);
  const yearRaw = vehicle.year ?? currentModelYear();
  const priceRaw = vehicle.price ?? "";

  return {
    brand: trimCell(vehicle.brand),
    model: trimCell(vehicle.model),
    variant: trimCell(vehicle.variant) || trimCell(vehicle.vehicleTitle),
    fuel: trimCell(vehicle.fuel),
    transmission: trimCell(vehicle.transmission),
    year: String(yearRaw),
    exShowroomPrice: priceRaw !== "" ? String(priceRaw) : "",
    city: trimCell(vehicle.city),
    state: trimCell(vehicle.state),
    imageUrl: primary,
    brochureUrl: trimCell(vehicle.brochureUrl),
    description: trimCell(vehicle.vehicleTitle),
  };
}

export function gaadiBazaarVehicleToImportRecord(
  vehicle: GaadiBazaarScrapedVehicle,
  rowNumber: number,
  payloadSegment?: CatalogImportSegment,
): ImportRecord {
  const fieldValues = gaadiBazaarVehicleToFieldValues(vehicle);
  const segment = resolveCatalogImportSegment(vehicle.segment, payloadSegment);
  const fields: Record<string, string | number | boolean | null> = {};

  for (const [key, value] of Object.entries(fieldValues)) {
    if (value !== undefined && value !== "") fields[key] = value;
  }

  const { gallery } = joinImageUrls(vehicle);
  if (gallery) fields.images = gallery;

  const sourceId = resolveSourceId(vehicle);
  if (sourceId) fields.source_id = sourceId;
  if (vehicle.vehicleUrl?.trim()) fields.vehicleUrl = vehicle.vehicleUrl.trim();

  return { rowNumber, segment, fields, raw: vehicle };
}

export function gaadiBazaarPayloadToImportRecords(payload: GaadiBazaarScraperPayload): ImportRecord[] {
  const payloadSegment = normalizeCatalogImportSegment(payload.segment) ?? undefined;
  return payload.vehicles.map((vehicle, index) =>
    gaadiBazaarVehicleToImportRecord(vehicle, index + 1, payloadSegment),
  );
}

export type GaadiBazaarMappedRow = {
  rowNumber: number;
  vehicle: GaadiBazaarScrapedVehicle;
  standard?: StandardCatalogImportRecord;
  importRecord?: ImportRecord;
  issues: string[];
};

export function mapGaadiBazaarVehicle(
  vehicle: GaadiBazaarScrapedVehicle,
  rowNumber: number,
  payloadSegment?: CatalogImportSegment,
): GaadiBazaarMappedRow {
  const importRecord = gaadiBazaarVehicleToImportRecord(vehicle, rowNumber, payloadSegment);
  const normalized = normalizeImportRecord(importRecord, payloadSegment);

  if (!normalized.importRecord) {
    return { rowNumber, vehicle, issues: normalized.issues };
  }

  return {
    rowNumber,
    vehicle,
    standard: normalized.standard,
    importRecord: normalized.importRecord,
    issues: normalized.issues,
  };
}

export function mapGaadiBazaarPayload(payload: GaadiBazaarScraperPayload): GaadiBazaarMappedRow[] {
  const payloadSegment = normalizeCatalogImportSegment(payload.segment) ?? undefined;
  return payload.vehicles.map((vehicle, index) =>
    mapGaadiBazaarVehicle(vehicle, index + 1, payloadSegment),
  );
}

export function mappedRowsToImportRecords(rows: GaadiBazaarMappedRow[]): ImportRecord[] {
  return rows.filter((r) => r.importRecord).map((r) => r.importRecord!);
}

export function mappedRowsToStandardRecords(rows: GaadiBazaarMappedRow[]): StandardCatalogImportRecord[] {
  return rows.filter((r) => r.standard).map((r) => r.standard!);
}
