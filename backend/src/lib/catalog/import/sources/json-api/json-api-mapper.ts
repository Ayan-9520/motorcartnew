import { resolveCatalogImportSegment } from "../../catalog-segment";
import type { ImportRecord } from "../../import-types";
import { trimCell } from "../../parser/value-normalizer";
import type {
  CatalogMasterJsonApiPayload,
  CatalogMasterVehicleRecord,
} from "./json-api-types";

function featuresToField(features: CatalogMasterVehicleRecord["features"]): string {
  if (Array.isArray(features)) {
    return features.map((f) => trimCell(String(f))).filter(Boolean).join("|");
  }
  return trimCell(features == null ? "" : String(features));
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  return trimCell(String(value));
}

/** Extract vehicle rows from supported JSON API envelope shapes. */
export function extractCatalogMasterVehicles(
  raw: unknown,
): { vehicles: CatalogMasterVehicleRecord[]; issues: string[] } {
  const issues: string[] = [];

  if (raw === null || raw === undefined) {
    return { vehicles: [], issues: ["Payload is empty"] };
  }

  if (Array.isArray(raw)) {
    if (raw.every((row) => row && typeof row === "object" && !Array.isArray(row))) {
      return { vehicles: raw as CatalogMasterVehicleRecord[], issues };
    }
    return { vehicles: [], issues: ["Top-level array must contain vehicle objects"] };
  }

  if (typeof raw !== "object") {
    return { vehicles: [], issues: ["Payload must be a JSON object or array"] };
  }

  const payload = raw as CatalogMasterJsonApiPayload;
  const candidates = payload.vehicles ?? payload.data;

  if (!Array.isArray(candidates)) {
    return {
      vehicles: [],
      issues: ["Payload must include a vehicles[] or data[] array of catalog master rows"],
    };
  }

  if (!candidates.every((row) => row && typeof row === "object" && !Array.isArray(row))) {
    return { vehicles: [], issues: ["vehicles/data entries must be objects"] };
  }

  return { vehicles: candidates as CatalogMasterVehicleRecord[], issues };
}

export function mapCatalogMasterVehicleToImportRecord(
  vehicle: CatalogMasterVehicleRecord,
  rowNumber: number,
  defaultSegment?: string,
): ImportRecord {
  const segment = resolveCatalogImportSegment(vehicle.segment, defaultSegment);
  const fields: Record<string, string> = {
    brand: cell(vehicle.brand),
    model: cell(vehicle.model),
    variant: cell(vehicle.variant),
    fuel: cell(vehicle.fuel),
    transmission: cell(vehicle.transmission),
    year: cell(vehicle.year),
    bodyType: cell(vehicle.bodyType),
    color: cell(vehicle.color),
    exShowroomPrice: cell(vehicle.exShowroomPrice),
    onRoadPrice: cell(vehicle.onRoadPrice),
    city: cell(vehicle.city),
    state: cell(vehicle.state),
    imageUrl: cell(vehicle.imageUrl),
    brochureUrl: cell(vehicle.brochureUrl),
    description: cell(vehicle.description),
    features: featuresToField(vehicle.features),
  };

  if (vehicle.externalId != null && String(vehicle.externalId).trim()) {
    fields.externalId = cell(vehicle.externalId);
    fields.source_id = cell(vehicle.externalId);
  }
  if (vehicle.sourceId != null && String(vehicle.sourceId).trim()) {
    fields.source_id = cell(vehicle.sourceId);
  }

  return {
    rowNumber,
    segment,
    fields,
    raw: vehicle as Record<string, unknown>,
  };
}

export function catalogMasterPayloadToImportRecords(
  raw: unknown,
  defaultSegment?: string,
): { records: ImportRecord[]; issues: string[] } {
  const { vehicles, issues } = extractCatalogMasterVehicles(raw);
  const payloadSegment =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as CatalogMasterJsonApiPayload).segment
      : undefined;

  const records = vehicles.map((vehicle, index) =>
    mapCatalogMasterVehicleToImportRecord(
      vehicle,
      index + 1,
      cell(vehicle.segment) || cell(payloadSegment) || defaultSegment,
    ),
  );

  return { records, issues };
}
