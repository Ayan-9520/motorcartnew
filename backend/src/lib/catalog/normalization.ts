import type { CatalogNormalizationConfig, FieldReplacementRule } from "./types";

export const DEFAULT_NORMALIZATION_CONFIG: CatalogNormalizationConfig = {
  brandReplacements: [
    { from: /^maruti\s+suzuki$/i, to: "maruti" },
    { from: /^maruti-suzuki$/i, to: "maruti" },
    { from: /^hyundai\s+motor(?:\s+india)?$/i, to: "hyundai" },
    { from: /^tata\s+motors$/i, to: "tata" },
    { from: /^mahindra\s+and\s+mahindra$/i, to: "mahindra" },
    { from: /^mercedes\s+benz$/i, to: "mercedes-benz" },
    { from: /^land\s+rover$/i, to: "land-rover" },
  ],
  fuelReplacements: [
    { from: /^petrol\s*\+\s*cng$/i, to: "petrol+cng" },
    { from: /^petrol\s*\/\s*cng$/i, to: "petrol+cng" },
    { from: /^cng\s*\+\s*petrol$/i, to: "petrol+cng" },
    { from: /^ev$/i, to: "electric" },
    { from: /^bev$/i, to: "electric" },
  ],
  transmissionReplacements: [
    { from: /^automatic$/i, to: "at" },
    { from: /^auto$/i, to: "at" },
    { from: /^amt$/i, to: "at" },
    { from: /^cvt$/i, to: "at" },
    { from: /^dct$/i, to: "at" },
    { from: /^dca$/i, to: "at" },
    { from: /^manual$/i, to: "mt" },
    { from: /^man$/i, to: "mt" },
  ],
  variantReplacements: [
    { from: /\(\s*o\s*\)/gi, to: " o" },
    { from: /\+/g, to: " plus " },
  ],
  variantStopWords: ["bs6", "bs6.2", "phase", "2", "edition", "new"],
};

export function slugifyCatalogToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function applyReplacements(value: string, rules: FieldReplacementRule[]): string {
  let out = value.trim();
  for (const rule of rules) {
    if (rule.from instanceof RegExp) {
      out = out.replace(rule.from, rule.to);
    } else if (out.toLowerCase() === rule.from.toLowerCase()) {
      out = rule.to;
    }
  }
  return out;
}

export function normalizeBrandLabel(brand: string, config: CatalogNormalizationConfig): string {
  const trimmed = brand.trim();
  for (const rule of config.brandReplacements) {
    if (rule.from instanceof RegExp && rule.from.test(trimmed)) {
      return rule.to;
    }
    if (typeof rule.from === "string" && trimmed.toLowerCase() === rule.from.toLowerCase()) {
      return rule.to;
    }
  }
  return trimmed;
}

export function normalizeFuelValue(fuel: string, config: CatalogNormalizationConfig = DEFAULT_NORMALIZATION_CONFIG): string {
  const replaced = applyReplacements(fuel.replace(/\s+/g, " ").trim(), config.fuelReplacements);
  const compact = replaced.toLowerCase().replace(/\s+/g, "");
  if (compact.includes("+")) {
    return compact.replace(/[^a-z0-9+]/g, "");
  }
  return slugifyCatalogToken(replaced);
}

export function normalizeTransmissionValue(
  transmission: string,
  config: CatalogNormalizationConfig = DEFAULT_NORMALIZATION_CONFIG,
): string {
  const replaced = applyReplacements(transmission.replace(/\s+/g, " ").trim(), config.transmissionReplacements);
  return slugifyCatalogToken(replaced);
}

export function normalizeVariantLabel(variant: string, config: CatalogNormalizationConfig): string {
  let value = variant.trim();
  for (const rule of config.variantReplacements) {
    value = value.replace(rule.from, rule.to);
  }
  const tokens = slugifyCatalogToken(value)
    .split("-")
    .filter((t) => t && !config.variantStopWords.includes(t));
  return tokens.join("-");
}

export function normalizeMatchFields(
  input: {
    segment: string;
    brand: string;
    model: string;
    variant: string;
    fuel: string;
    transmission: string;
    modelYear: number;
  },
  config: CatalogNormalizationConfig = DEFAULT_NORMALIZATION_CONFIG,
) {
  return {
    segment: slugifyCatalogToken(input.segment),
    brandSlug: slugifyCatalogToken(normalizeBrandLabel(input.brand, config)),
    modelSlug: slugifyCatalogToken(input.model),
    variantSlug: normalizeVariantLabel(input.variant, config),
    fuelSlug: normalizeFuelValue(input.fuel, config),
    transmissionSlug: normalizeTransmissionValue(input.transmission, config),
    modelYear: input.modelYear,
  };
}
