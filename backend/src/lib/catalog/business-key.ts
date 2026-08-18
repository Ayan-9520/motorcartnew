import { normalizeFuelValue, normalizeTransmissionValue, slugifyCatalogToken } from "./normalization";

export type BusinessKeyParts = {
  segment: string;
  brandSlug: string;
  modelSlug: string;
  variantSlug: string;
  fuelType: string;
  transmission: string;
  modelYear: number;
};

export function slugifyCatalog(value: string): string {
  return slugifyCatalogToken(value);
}

/** Stable catalog business key — segment|brand|model|variant|fuel|transmission|year */
export function buildCatalogBusinessKey(parts: BusinessKeyParts): string {
  return [
    slugifyCatalog(parts.segment),
    slugifyCatalog(parts.brandSlug),
    slugifyCatalog(parts.modelSlug),
    slugifyCatalog(parts.variantSlug),
    normalizeFuelValue(parts.fuelType),
    normalizeTransmissionValue(parts.transmission),
    String(parts.modelYear),
  ].join("|");
}

export function businessKeyFromLabels(input: {
  segment: string;
  brand: string;
  model: string;
  variant: string;
  fuel: string;
  transmission: string;
  modelYear: number;
}): string {
  return buildCatalogBusinessKey({
    segment: input.segment,
    brandSlug: slugifyCatalog(input.brand),
    modelSlug: slugifyCatalog(input.model),
    variantSlug: slugifyCatalog(input.variant),
    fuelType: input.fuel,
    transmission: input.transmission,
    modelYear: input.modelYear,
  });
}
