/** Resolve catalog-master JSON API configuration from env + optional overrides. */

export type CatalogMasterJsonApiConfig = {
  source: string;
  sourceUrl: string | null;
  apiKey: string | null;
};

export type CatalogMasterJsonApiConfigOverrides = {
  source?: string;
  sourceUrl?: string | null;
  apiKey?: string | null;
};

export function resolveCatalogMasterJsonApiConfig(
  overrides: CatalogMasterJsonApiConfigOverrides = {},
): CatalogMasterJsonApiConfig {
  const source = (
    overrides.source ??
    process.env.CATALOG_MASTER_SOURCE ??
    "json_api"
  )
    .trim()
    .toLowerCase();

  const rawUrl =
    overrides.sourceUrl !== undefined
      ? overrides.sourceUrl
      : process.env.CATALOG_MASTER_SOURCE_URL;
  const sourceUrl = typeof rawUrl === "string" && rawUrl.trim() ? rawUrl.trim() : null;

  const rawKey =
    overrides.apiKey !== undefined ? overrides.apiKey : process.env.CATALOG_MASTER_API_KEY;
  const apiKey = typeof rawKey === "string" && rawKey.trim() ? rawKey.trim() : null;

  return { source, sourceUrl, apiKey };
}
