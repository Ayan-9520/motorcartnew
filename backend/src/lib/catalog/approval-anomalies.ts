import { applyBrandAlias } from "./aliases";
import {
  DEFAULT_NORMALIZATION_CONFIG,
  normalizeBrandLabel,
  normalizeFuelValue,
  normalizeTransmissionValue,
  slugifyCatalogToken,
} from "./normalization";
import type { ApprovalIssue, ApprovalRecommendation, CatalogApprovalHighlights } from "./approval-types";
import type { CatalogLinkRow } from "./linking-types";
import type { CatalogVariantRecord } from "./types";

export type CatalogKnowledge = {
  brandSlugs: Set<string>;
  brandModels: Set<string>;
  fuelSlugs: Set<string>;
  transmissionSlugs: Set<string>;
  businessKeyToVariantIds: Map<string, string[]>;
};

export function buildCatalogKnowledge(catalog: CatalogVariantRecord[]): CatalogKnowledge {
  const brandSlugs = new Set<string>();
  const brandModels = new Set<string>();
  const fuelSlugs = new Set<string>();
  const transmissionSlugs = new Set<string>();
  const businessKeyToVariantIds = new Map<string, string[]>();

  for (const v of catalog) {
    brandSlugs.add(v.brandSlug);
    brandModels.add(`${v.brandSlug}|${v.modelSlug}`);
    fuelSlugs.add(v.fuelType);
    transmissionSlugs.add(v.transmission);

    const existing = businessKeyToVariantIds.get(v.businessKey) ?? [];
    existing.push(v.id);
    businessKeyToVariantIds.set(v.businessKey, existing);
  }

  return { brandSlugs, brandModels, fuelSlugs, transmissionSlugs, businessKeyToVariantIds };
}

function listingBrandSlug(brand: string): string {
  return slugifyCatalogToken(
    applyBrandAlias(slugifyCatalogToken(normalizeBrandLabel(brand, DEFAULT_NORMALIZATION_CONFIG))),
  );
}

function listingModelSlug(model: string): string {
  return slugifyCatalogToken(model);
}

export function detectRowIssues(
  row: CatalogLinkRow,
  knowledge: CatalogKnowledge,
  listingFuel?: string | null,
  listingTransmission?: string | null,
): ApprovalIssue[] {
  const issues: ApprovalIssue[] = [];
  const brandSlug = listingBrandSlug(row.brand);
  const modelSlug = listingModelSlug(row.model);
  const modelKey = `${brandSlug}|${modelSlug}`;

  if (!knowledge.brandSlugs.has(brandSlug)) {
    issues.push({
      type: "UNKNOWN_BRAND",
      message: `Brand "${row.brand}" not found in catalog index`,
      listingId: row.listingId,
    });
  } else if (!knowledge.brandModels.has(modelKey) && row.matchStatus === "NO_MATCH") {
    issues.push({
      type: "MISSING_CATALOG_MODEL",
      message: `Model "${row.model}" missing under brand "${row.brand}" in catalog`,
      listingId: row.listingId,
    });
  }

  const fuel = listingFuel ?? "";
  const fuelSlug = normalizeFuelValue(fuel);
  if (fuel.trim() && !knowledge.fuelSlugs.has(fuelSlug) && fuelSlug !== "unknown") {
    issues.push({
      type: "UNKNOWN_FUEL",
      message: `Fuel "${fuel}" not recognized in catalog fuels`,
      listingId: row.listingId,
    });
  }

  const transmission = listingTransmission ?? "";
  const transSlug = normalizeTransmissionValue(transmission);
  if (transmission.trim() && !knowledge.transmissionSlugs.has(transSlug) && transSlug !== "unknown") {
    issues.push({
      type: "UNKNOWN_TRANSMISSION",
      message: `Transmission "${transmission}" not recognized in catalog transmissions`,
      listingId: row.listingId,
    });
  }

  if (row.matchStatus === "MULTIPLE_MATCHES" && row.candidateVariantIds?.length) {
    issues.push({
      type: "CONFLICTING_VARIANTS",
      message: `Conflicting variants: ${row.candidateVariantIds.join(", ")}`,
      listingId: row.listingId,
    });
  }

  if (row.businessKey) {
    const dupes = knowledge.businessKeyToVariantIds.get(row.businessKey);
    if (dupes && dupes.length > 1) {
      issues.push({
        type: "DUPLICATE_BUSINESS_KEY",
        message: `Business key "${row.businessKey}" maps to ${dupes.length} catalog variants`,
        listingId: row.listingId,
        businessKey: row.businessKey,
      });
    }
  }

  return issues;
}

export function buildHighlights(
  rows: CatalogLinkRow[],
  knowledge: CatalogKnowledge,
  contextByListing: Map<string, { fuel?: string | null; transmission?: string | null }>,
): CatalogApprovalHighlights {
  const duplicateBusinessKeys = [...knowledge.businessKeyToVariantIds.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([businessKey, variantIds]) => ({
      businessKey,
      variantIds,
      count: variantIds.length,
    }));

  const conflictingVariants = rows
    .filter((r) => r.matchStatus === "MULTIPLE_MATCHES" && r.candidateVariantIds?.length)
    .map((r) => ({
      listingId: r.listingId,
      candidateVariantIds: r.candidateVariantIds!,
    }));

  const missingModelsMap = new Map<string, { brand: string; model: string; listingIds: string[] }>();
  const unknownBrandsMap = new Map<string, { brand: string; listingIds: string[] }>();
  const unknownFuelsMap = new Map<string, { fuel: string; listingIds: string[] }>();
  const unknownTransMap = new Map<string, { transmission: string; listingIds: string[] }>();

  for (const row of rows) {
    const ctx = contextByListing.get(row.listingId);
    const issues = detectRowIssues(row, knowledge, ctx?.fuel, ctx?.transmission);
    for (const issue of issues) {
      switch (issue.type) {
        case "MISSING_CATALOG_MODEL": {
          const key = `${row.brand}|${row.model}`;
          const entry = missingModelsMap.get(key) ?? { brand: row.brand, model: row.model, listingIds: [] };
          entry.listingIds.push(row.listingId);
          missingModelsMap.set(key, entry);
          break;
        }
        case "UNKNOWN_BRAND": {
          const entry = unknownBrandsMap.get(row.brand) ?? { brand: row.brand, listingIds: [] };
          entry.listingIds.push(row.listingId);
          unknownBrandsMap.set(row.brand, entry);
          break;
        }
        case "UNKNOWN_FUEL": {
          const fuel = ctx?.fuel ?? "unknown";
          const entry = unknownFuelsMap.get(fuel) ?? { fuel, listingIds: [] };
          entry.listingIds.push(row.listingId);
          unknownFuelsMap.set(fuel, entry);
          break;
        }
        case "UNKNOWN_TRANSMISSION": {
          const transmission = ctx?.transmission ?? "unknown";
          const entry = unknownTransMap.get(transmission) ?? { transmission, listingIds: [] };
          entry.listingIds.push(row.listingId);
          unknownTransMap.set(transmission, entry);
          break;
        }
      }
    }
  }

  return {
    duplicateBusinessKeys,
    conflictingVariants,
    missingCatalogModels: [...missingModelsMap.values()],
    unknownBrands: [...unknownBrandsMap.values()],
    unknownFuels: [...unknownFuelsMap.values()],
    unknownTransmissions: [...unknownTransMap.values()],
  };
}

export function buildRecommendations(
  rows: CatalogLinkRow[],
  highlights: CatalogApprovalHighlights,
): ApprovalRecommendation[] {
  const recs: ApprovalRecommendation[] = [];

  for (const dup of highlights.duplicateBusinessKeys) {
    recs.push({
      kind: "MERGE_DUPLICATE",
      message: `Merge duplicate catalog variants sharing business key "${dup.businessKey}"`,
      priority: "high",
    });
  }

  for (const conflict of highlights.conflictingVariants) {
    recs.push({
      kind: "CREATE_CATALOG_VARIANT",
      message: `Resolve conflicting variant candidates for listing ${conflict.listingId}`,
      listingId: conflict.listingId,
      priority: "high",
    });
  }

  for (const missing of highlights.missingCatalogModels) {
    recs.push({
      kind: "CREATE_CATALOG_VARIANT",
      message: `Create catalog model/variants for ${missing.brand} ${missing.model} (${missing.listingIds.length} listings)`,
      brand: missing.brand,
      model: missing.model,
      priority: "high",
    });
  }

  for (const brand of highlights.unknownBrands) {
    recs.push({
      kind: "CREATE_ALIAS",
      message: `Create brand alias or catalog brand entry for "${brand.brand}"`,
      brand: brand.brand,
      priority: "medium",
    });
  }

  for (const fuel of highlights.unknownFuels) {
    recs.push({
      kind: "UPDATE_NORMALIZATION",
      message: `Update fuel normalization/alias rules for "${fuel.fuel}"`,
      priority: "medium",
    });
  }

  for (const trans of highlights.unknownTransmissions) {
    recs.push({
      kind: "UPDATE_NORMALIZATION",
      message: `Update transmission normalization/alias rules for "${trans.transmission}"`,
      priority: "medium",
    });
  }

  for (const row of rows) {
    if (row.matchStatus === "NO_MATCH" && row.reason.includes("Missing required")) continue;
    if (row.matchStatus === "LOW_CONFIDENCE") {
      recs.push({
        kind: "UPDATE_NORMALIZATION",
        message: `Improve normalization rules for ${row.brand} ${row.model} variant "${row.variant ?? ""}"`,
        listingId: row.listingId,
        brand: row.brand,
        model: row.model,
        priority: "low",
      });
    }
  }

  return dedupeRecommendations(recs);
}

function dedupeRecommendations(recs: ApprovalRecommendation[]): ApprovalRecommendation[] {
  const seen = new Set<string>();
  const out: ApprovalRecommendation[] = [];
  for (const r of recs) {
    const key = `${r.kind}|${r.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}
