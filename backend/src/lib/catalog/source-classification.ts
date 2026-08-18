/** Catalog ingest source classification — mock data must never silently become live inventory. */

export const CATALOG_SOURCE_CLASSIFICATIONS = [
  "LICENSED_SOURCE",
  "PARTNER_FEED",
  "INTERNAL",
  "MOCK",
] as const;

export type CatalogSourceClassification = (typeof CATALOG_SOURCE_CLASSIFICATIONS)[number];

export type CatalogSourceClassificationInput = {
  sourceCode?: string | null;
  sourceUrl?: string | null;
  apiKey?: string | null;
};

export type CatalogSourceClassificationResult = {
  classification: CatalogSourceClassification;
  licensed: boolean;
  reason: string;
};

const MOCK_URL_MARKERS = ["catalog-master-mock", "localhost:3099", "127.0.0.1:3099", ":3099/"];
const MOCK_KEYS = ["local-dev-mock-key", "mock-key", "test-mock"];

function looksLikeMockUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return MOCK_URL_MARKERS.some((m) => lower.includes(m));
}

function looksLikeMockKey(key: string | null | undefined): boolean {
  if (!key) return false;
  const lower = key.trim().toLowerCase();
  return MOCK_KEYS.includes(lower) || lower.includes("mock");
}

export function classifyCatalogSource(
  input: CatalogSourceClassificationInput = {},
): CatalogSourceClassificationResult {
  const code = (input.sourceCode ?? "").trim().toLowerCase();
  const url = input.sourceUrl?.trim() || null;
  const apiKey = input.apiKey?.trim() || null;

  if (code.includes("mock") || looksLikeMockUrl(url) || (code === "json_api" && looksLikeMockKey(apiKey))) {
    return {
      classification: "MOCK",
      licensed: false,
      reason: "Source is a local/mock catalog feed and cannot be published as live inventory",
    };
  }

  if (code === "json_api") {
    if (!url) {
      return {
        classification: "INTERNAL",
        licensed: false,
        reason: "JSON API catalog master URL is not configured",
      };
    }
    return {
      classification: "LICENSED_SOURCE",
      licensed: true,
      reason: "JSON API catalog master with a non-mock URL",
    };
  }

  if (code === "oem_feed" || code === "licensed" || code.includes("oem")) {
    return {
      classification: "LICENSED_SOURCE",
      licensed: true,
      reason: "OEM / licensed catalog source",
    };
  }

  if (code === "gaadi_bazaar" || code.includes("partner") || code === "csv" || code === "excel") {
    return {
      classification: "PARTNER_FEED",
      licensed: false,
      reason: "Partner or scrape feed — not a licensed catalog master",
    };
  }

  return {
    classification: "INTERNAL",
    licensed: false,
    reason: "Internal or unclassified catalog source",
  };
}

export function assertCatalogSourceMayPublish(input: CatalogSourceClassificationInput): CatalogSourceClassificationResult {
  const result = classifyCatalogSource(input);
  if (result.classification === "MOCK") {
    const err = Object.assign(new Error(result.reason), {
      code: "MOCK_SOURCE_PUBLISH_FORBIDDEN",
    });
    throw err;
  }
  return result;
}
