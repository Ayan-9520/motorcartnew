/** Internal catalog matching types — not exposed via API (Phase 2B). */

export type CatalogMatchConfidence = 100 | 95 | 80 | 60 | 0;

export type CatalogMatchMethod = "exact" | "normalized" | "alias" | "fuzzy" | "none";

export type CatalogMatchInput = {
  segment: string;
  brand: string;
  model: string;
  variant: string;
  fuel: string;
  transmission: string;
  modelYear: number;
};

export type CatalogVariantRecord = {
  id: string;
  segment: string;
  brandSlug: string;
  brandName: string;
  modelSlug: string;
  modelName: string;
  variantSlug: string;
  variantName: string;
  fuelType: string;
  transmission: string;
  modelYear: number;
  businessKey: string;
};

export type CatalogMatchResult = {
  catalogVariantId: string | null;
  businessKey: string | null;
  confidence: CatalogMatchConfidence;
  method: CatalogMatchMethod;
  /** Present when a variant was matched (read-only snapshot). */
  matchedVariant?: CatalogVariantRecord;
};

export type BrandAliasRule = {
  /** Normalized slug or pattern matched against normalized brand slug. */
  match: string | RegExp;
  canonical: string;
};

export type FieldReplacementRule = {
  from: string | RegExp;
  to: string;
};

export type CatalogNormalizationConfig = {
  brandReplacements: FieldReplacementRule[];
  fuelReplacements: FieldReplacementRule[];
  transmissionReplacements: FieldReplacementRule[];
  variantReplacements: FieldReplacementRule[];
  /** Strip these tokens from variant names before slugify. */
  variantStopWords: string[];
};

export type CatalogAliasConfig = {
  brands: BrandAliasRule[];
  fuels: FieldReplacementRule[];
  transmissions: FieldReplacementRule[];
};

export type CatalogMatchingConfig = {
  normalization: CatalogNormalizationConfig;
  aliases: CatalogAliasConfig;
  /** Minimum fuzzy score (0–1) to accept a fuzzy match. */
  fuzzyMinScore: number;
};
