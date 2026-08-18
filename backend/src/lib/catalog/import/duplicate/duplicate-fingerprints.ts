import { buildCatalogBusinessKey } from "../../business-key";
import { DEFAULT_CATALOG_IMPORT_SEGMENT } from "../catalog-segment";
import type { CatalogImportSegment } from "../catalog-segment";
import type { DuplicateDetectionRecord, DuplicateSignal } from "./duplicate-types";

export type RecordFingerprints = {
  rowNumber: number;
  businessKey: string;
  sourceId: string | null;
  imageUrl: string | null;
  attributesKey: string;
  attributesPriceKey: string;
  priceSignature: string;
};

function norm(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function priceSig(record: DuplicateDetectionRecord): string {
  const ex = record.exShowroomPrice;
  const on = record.onRoadPrice;
  if (ex === null && on === null) return "";
  return `${ex ?? ""}|${on ?? ""}`;
}

export function buildRecordFingerprints(
  record: DuplicateDetectionRecord,
  defaultSegment: CatalogImportSegment = DEFAULT_CATALOG_IMPORT_SEGMENT,
): RecordFingerprints {
  const segment = record.segment ?? defaultSegment;
  const businessKey = buildCatalogBusinessKey({
    segment,
    brandSlug: record.brand,
    modelSlug: record.model,
    variantSlug: record.variant,
    fuelType: record.fuel,
    transmission: record.transmission,
    modelYear: record.year,
  });

  const attributesKey = [
    norm(record.brand),
    norm(record.model),
    norm(record.variant),
    norm(record.fuel),
    norm(record.transmission),
    String(record.year),
  ].join("|");

  const price = priceSig(record);
  const attributesPriceKey = price ? `${attributesKey}|${price}` : attributesKey;

  return {
    rowNumber: record.rowNumber,
    businessKey,
    sourceId: record.sourceId?.trim() ? record.sourceId.trim() : null,
    imageUrl: record.imageUrl?.trim() ? record.imageUrl.trim().toLowerCase() : null,
    attributesKey,
    attributesPriceKey,
    priceSignature: price,
  };
}

export function fingerprintForSignal(fp: RecordFingerprints, signal: DuplicateSignal): string | null {
  switch (signal) {
    case "business_key":
      return fp.businessKey;
    case "source_id":
      return fp.sourceId;
    case "image_url":
      return fp.imageUrl;
    case "attributes":
      return fp.attributesKey;
    case "attributes_price":
      return fp.attributesPriceKey;
    default:
      return null;
  }
}
