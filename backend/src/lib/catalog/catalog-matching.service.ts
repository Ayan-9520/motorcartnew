import { applyBrandAlias, applyFuelAlias, applyTransmissionAlias, DEFAULT_ALIAS_CONFIG } from "./aliases";
import { buildCatalogBusinessKey, businessKeyFromLabels } from "./business-key";
import { fuzzyVariantScore } from "./fuzzy";
import {
  DEFAULT_NORMALIZATION_CONFIG,
  normalizeMatchFields,
  slugifyCatalogToken,
} from "./normalization";
import type {
  CatalogMatchConfidence,
  CatalogMatchInput,
  CatalogMatchMethod,
  CatalogMatchResult,
  CatalogMatchingConfig,
  CatalogVariantRecord,
} from "./types";

export const DEFAULT_MATCHING_CONFIG: CatalogMatchingConfig = {
  normalization: DEFAULT_NORMALIZATION_CONFIG,
  aliases: DEFAULT_ALIAS_CONFIG,
  fuzzyMinScore: 0.72,
};

const CONFIDENCE_BY_METHOD: Record<CatalogMatchMethod, CatalogMatchConfidence> = {
  exact: 100,
  normalized: 95,
  alias: 80,
  fuzzy: 60,
  none: 0,
};

export type CatalogMatchingIndex = {
  byBusinessKey: Map<string, CatalogVariantRecord>;
  variants: CatalogVariantRecord[];
};

export function buildCatalogMatchingIndex(variants: CatalogVariantRecord[]): CatalogMatchingIndex {
  const byBusinessKey = new Map<string, CatalogVariantRecord>();
  for (const variant of variants) {
    byBusinessKey.set(variant.businessKey, variant);
  }
  return { byBusinessKey, variants };
}

function result(
  method: CatalogMatchMethod,
  variant: CatalogVariantRecord | null,
  businessKey: string | null,
): CatalogMatchResult {
  if (!variant || method === "none") {
    return {
      catalogVariantId: null,
      businessKey: null,
      confidence: 0,
      method: "none",
    };
  }
  return {
    catalogVariantId: variant.id,
    businessKey: businessKey ?? variant.businessKey,
    confidence: CONFIDENCE_BY_METHOD[method],
    method,
    matchedVariant: variant,
  };
}

function aliasKeyFromNormalized(
  normalized: ReturnType<typeof normalizeMatchFields>,
  config: CatalogMatchingConfig,
): string {
  const brandSlug = applyBrandAlias(normalized.brandSlug, config.aliases);
  const fuelSlug = applyFuelAlias(normalized.fuelSlug, config.aliases);
  const transmissionSlug = applyTransmissionAlias(normalized.transmissionSlug, config.aliases);
  return buildCatalogBusinessKey({
    segment: normalized.segment,
    brandSlug,
    modelSlug: normalized.modelSlug,
    variantSlug: normalized.variantSlug,
    fuelType: fuelSlug,
    transmission: transmissionSlug,
    modelYear: normalized.modelYear,
  });
}

function fuzzyMatch(
  input: CatalogMatchInput,
  normalized: ReturnType<typeof normalizeMatchFields>,
  index: CatalogMatchingIndex,
  config: CatalogMatchingConfig,
): CatalogVariantRecord | null {
  const all = fuzzyMatchAll(input, normalized, index, config);
  return all[0] ?? null;
}

function fuzzyMatchAll(
  _input: CatalogMatchInput,
  normalized: ReturnType<typeof normalizeMatchFields>,
  index: CatalogMatchingIndex,
  config: CatalogMatchingConfig,
): CatalogVariantRecord[] {
  const brandSlug = applyBrandAlias(normalized.brandSlug, config.aliases);
  let bestScore = 0;
  const best: CatalogVariantRecord[] = [];

  for (const candidate of index.variants) {
    if (candidate.segment !== normalized.segment) continue;
    if (candidate.modelYear !== normalized.modelYear) continue;
    if (candidate.brandSlug !== brandSlug && candidate.brandSlug !== normalized.brandSlug) continue;
    if (candidate.modelSlug !== normalized.modelSlug) continue;

    const fuelOk =
      candidate.fuelType === normalized.fuelSlug ||
      applyFuelAlias(candidate.fuelType, config.aliases) === applyFuelAlias(normalized.fuelSlug, config.aliases);
    if (!fuelOk) continue;

    const transOk =
      candidate.transmission === normalized.transmissionSlug ||
      applyTransmissionAlias(candidate.transmission, config.aliases) ===
        applyTransmissionAlias(normalized.transmissionSlug, config.aliases);
    if (!transOk) continue;

    const score = fuzzyVariantScore(normalized.variantSlug, candidate.variantSlug);
    if (score < config.fuzzyMinScore) continue;

    if (score > bestScore) {
      bestScore = score;
      best.length = 0;
      best.push(candidate);
    } else if (score === bestScore) {
      best.push(candidate);
    }
  }

  return best;
}

/**
 * Catalog Matching Engine (Phase 2B — internal only).
 * Returns a match result; never writes to the database.
 */
export class CatalogMatchingService {
  constructor(
    private readonly index: CatalogMatchingIndex,
    private readonly config: CatalogMatchingConfig = DEFAULT_MATCHING_CONFIG,
  ) {}

  match(input: CatalogMatchInput): CatalogMatchResult {
    const segment = slugifyCatalogToken(input.segment);
    if (!input.brand?.trim() || !input.model?.trim() || !input.variant?.trim()) {
      return result("none", null, null);
    }

    // 1) Exact — raw labels slugified without normalization rules
    const exactKey = businessKeyFromLabels({ ...input, segment });
    const exactHit = this.index.byBusinessKey.get(exactKey);
    if (exactHit) {
      return result("exact", exactHit, exactKey);
    }

    // 2) Normalized — configurable cleanup + slug rules
    const normalized = normalizeMatchFields({ ...input, segment }, this.config.normalization);
    const normalizedKey = buildCatalogBusinessKey({
      segment: normalized.segment,
      brandSlug: normalized.brandSlug,
      modelSlug: normalized.modelSlug,
      variantSlug: normalized.variantSlug,
      fuelType: normalized.fuelSlug,
      transmission: normalized.transmissionSlug,
      modelYear: normalized.modelYear,
    });
    const normalizedHit = this.index.byBusinessKey.get(normalizedKey);
    if (normalizedHit) {
      return result("normalized", normalizedHit, normalizedKey);
    }

    // 3) Alias — brand/fuel/transmission alias map on normalized slugs
    const aliasKey = aliasKeyFromNormalized(normalized, this.config);
    const aliasHit = this.index.byBusinessKey.get(aliasKey);
    if (aliasHit) {
      return result("alias", aliasHit, aliasKey);
    }

    // 4) Fuzzy — same segment/model/year/fuel/trans, variant slug similarity
    const fuzzyHit = fuzzyMatch(input, normalized, this.index, this.config);
    if (fuzzyHit) {
      return result("fuzzy", fuzzyHit, fuzzyHit.businessKey);
    }

    // 5) No match
    return result("none", null, null);
  }

  /** Batch helper for import pipelines (still read-only). */
  matchMany(inputs: CatalogMatchInput[]): CatalogMatchResult[] {
    return inputs.map((input) => this.match(input));
  }

  /**
   * Returns all catalog variants tied at the best match tier (read-only).
   * Used by the linking dry-run service to detect ambiguous matches.
   */
  matchCandidates(input: CatalogMatchInput): CatalogMatchResult[] {
    const segment = slugifyCatalogToken(input.segment);
    if (!input.brand?.trim() || !input.model?.trim() || !input.variant?.trim()) {
      return [result("none", null, null)];
    }

    const exactKey = businessKeyFromLabels({ ...input, segment });
    const exactHit = this.index.byBusinessKey.get(exactKey);
    if (exactHit) {
      return [result("exact", exactHit, exactKey)];
    }

    const normalized = normalizeMatchFields({ ...input, segment }, this.config.normalization);
    const normalizedKey = buildCatalogBusinessKey({
      segment: normalized.segment,
      brandSlug: normalized.brandSlug,
      modelSlug: normalized.modelSlug,
      variantSlug: normalized.variantSlug,
      fuelType: normalized.fuelSlug,
      transmission: normalized.transmissionSlug,
      modelYear: normalized.modelYear,
    });
    const normalizedHit = this.index.byBusinessKey.get(normalizedKey);
    if (normalizedHit) {
      return [result("normalized", normalizedHit, normalizedKey)];
    }

    const aliasKey = aliasKeyFromNormalized(normalized, this.config);
    const aliasHit = this.index.byBusinessKey.get(aliasKey);
    if (aliasHit) {
      return [result("alias", aliasHit, aliasKey)];
    }

    const fuzzyHits = fuzzyMatchAll(input, normalized, this.index, this.config);
    if (fuzzyHits.length > 0) {
      return fuzzyHits.map((variant) => result("fuzzy", variant, variant.businessKey));
    }

    return [result("none", null, null)];
  }
}

export function createCatalogMatchingService(
  variants: CatalogVariantRecord[],
  config?: Partial<CatalogMatchingConfig>,
): CatalogMatchingService {
  const merged: CatalogMatchingConfig = {
    ...DEFAULT_MATCHING_CONFIG,
    ...config,
    normalization: { ...DEFAULT_NORMALIZATION_CONFIG, ...config?.normalization },
    aliases: { ...DEFAULT_ALIAS_CONFIG, ...config?.aliases },
  };
  return new CatalogMatchingService(buildCatalogMatchingIndex(variants), merged);
}