import type { CatalogAliasConfig, FieldReplacementRule } from "./types";

export const DEFAULT_ALIAS_CONFIG: CatalogAliasConfig = {
  brands: [
    { match: "ms", canonical: "maruti" },
    { match: "maruti-suzuki", canonical: "maruti" },
    { match: "suzuki", canonical: "maruti" },
    { match: "hyundai-india", canonical: "hyundai" },
    { match: "tata-motors", canonical: "tata" },
    { match: /^mercedes$/i, canonical: "mercedes-benz" },
    { match: "mb", canonical: "mercedes-benz" },
    { match: "re", canonical: "royal-enfield" },
  ],
  fuels: [
    { from: "gasoline", to: "petrol" },
    { from: "gas", to: "petrol" },
    { from: "diesel", to: "diesel" },
    { from: "cng", to: "petrol+cng" },
    { from: "petrol-cng", to: "petrol+cng" },
    { from: "electric", to: "electric" },
  ],
  transmissions: [
    { from: "automatic", to: "at" },
    { from: "manual", to: "mt" },
    { from: "torque-converter", to: "at" },
  ],
};

function applyAliasRules(value: string, rules: FieldReplacementRule[]): string {
  const lower = value.toLowerCase();
  for (const rule of rules) {
    if (rule.from instanceof RegExp && rule.from.test(value)) {
      return rule.to;
    }
    if (typeof rule.from === "string" && lower === rule.from.toLowerCase()) {
      return rule.to;
    }
  }
  return value;
}

export function applyBrandAlias(brandSlug: string, config: CatalogAliasConfig = DEFAULT_ALIAS_CONFIG): string {
  for (const rule of config.brands) {
    if (rule.match instanceof RegExp && rule.match.test(brandSlug)) {
      return rule.canonical;
    }
    if (typeof rule.match === "string" && brandSlug === rule.match) {
      return rule.canonical;
    }
  }
  return brandSlug;
}

export function applyFuelAlias(fuelSlug: string, config: CatalogAliasConfig = DEFAULT_ALIAS_CONFIG): string {
  return applyAliasRules(fuelSlug, config.fuels);
}

export function applyTransmissionAlias(
  transmissionSlug: string,
  config: CatalogAliasConfig = DEFAULT_ALIAS_CONFIG,
): string {
  return applyAliasRules(transmissionSlug, config.transmissions);
}
