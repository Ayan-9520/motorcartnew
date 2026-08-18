import { adapterFailure, adapterSuccess, SOURCE_ADAPTER_DISPLAY_NAMES } from "../adapter-types";
import type { AdapterContext } from "../adapter-context";
import type { AdapterResult } from "../adapter-types";
import type { SourceAdapter } from "../source-adapter";
import {
  resolveCatalogMasterJsonApiConfig,
  type CatalogMasterJsonApiConfig,
  type CatalogMasterJsonApiConfigOverrides,
} from "./json-api-config";
import { isListingShapedPayload } from "./json-api-listing-guard";
import { catalogMasterPayloadToImportRecords } from "./json-api-mapper";
import { CATALOG_MASTER_PAYLOAD_KEY } from "./json-api-types";
import { classifyCatalogSource } from "../../../source-classification";
import type { ImportRecord } from "../../import-types";

export type CatalogMasterFetchImpl = (
  url: string,
  init?: RequestInit,
) => Promise<{
  ok: boolean;
  status: number;
  statusText?: string;
  text(): Promise<string>;
  json(): Promise<unknown>;
}>;

function readConfigOverrides(context: AdapterContext): CatalogMasterJsonApiConfigOverrides {
  const fromMeta = context.metadata.config as CatalogMasterJsonApiConfigOverrides | undefined;
  const nested =
    context.metadata.catalogMasterConfig as CatalogMasterJsonApiConfigOverrides | undefined;
  return { ...(fromMeta ?? {}), ...(nested ?? {}) };
}

function getFetchImpl(context: AdapterContext): CatalogMasterFetchImpl {
  const config = context.metadata.config as { fetchImpl?: CatalogMasterFetchImpl } | undefined;
  if (config?.fetchImpl) return config.fetchImpl;
  return globalThis.fetch as CatalogMasterFetchImpl;
}

function stampSourceClassification(
  records: ImportRecord[],
  config: CatalogMasterJsonApiConfig,
): ImportRecord[] {
  const classified = classifyCatalogSource({
    sourceCode: config.source,
    sourceUrl: config.sourceUrl,
    apiKey: config.apiKey,
  });
  return records.map((record) => ({
    ...record,
    fields: {
      ...record.fields,
      source_classification: classified.classification,
      source_licensed: classified.licensed,
    },
  }));
}

/**
 * Catalog master JSON API source adapter.
 * Fetches REAL new-vehicle master data from a configured HTTPS URL.
 * Never scrapes listings; never writes to the database.
 */
export class JsonApiSourceAdapter implements SourceAdapter {
  readonly sourceId = "json_api" as const;

  get displayName(): string {
    return SOURCE_ADAPTER_DISPLAY_NAMES.json_api;
  }

  async connect(
    context: AdapterContext,
  ): Promise<AdapterResult<import("../adapter-types").AdapterConnectionInfo>> {
    const config = resolveCatalogMasterJsonApiConfig(readConfigOverrides(context));

    if (config.source && config.source !== "json_api") {
      return adapterFailure(
        "connect",
        "CATALOG_MASTER_SOURCE_INVALID",
        `CATALOG_MASTER_SOURCE must be "json_api" for this adapter (got "${config.source}")`,
        { details: { source: config.source } },
      );
    }

    if (!config.sourceUrl) {
      return adapterFailure(
        "connect",
        "CATALOG_MASTER_SOURCE_URL_NOT_CONFIGURED",
        "CATALOG_MASTER_SOURCE_URL is required for catalog master JSON API ingestion",
      );
    }

    let parsed: URL;
    try {
      parsed = new URL(config.sourceUrl);
    } catch {
      return adapterFailure(
        "connect",
        "CATALOG_MASTER_SOURCE_URL_INVALID",
        "CATALOG_MASTER_SOURCE_URL must be a valid absolute URL",
      );
    }

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return adapterFailure(
        "connect",
        "CATALOG_MASTER_SOURCE_URL_INVALID",
        "CATALOG_MASTER_SOURCE_URL must use http or https",
      );
    }

    const info = {
      connected: true,
      connectedAt: new Date().toISOString(),
      endpoint: config.sourceUrl,
      metadata: {
        hasApiKey: Boolean(config.apiKey),
        source: "json_api",
      },
    };
    context.setConnection(info);
    context.metadata.catalogMasterResolvedConfig = {
      source: config.source || "json_api",
      sourceUrl: config.sourceUrl,
      hasApiKey: Boolean(config.apiKey),
    };
    return adapterSuccess("connect", info);
  }

  async fetch(
    context: AdapterContext,
  ): Promise<AdapterResult<import("../adapter-types").AdapterFetchPayload>> {
    const config = resolveCatalogMasterJsonApiConfig(readConfigOverrides(context));
    if (!config.sourceUrl) {
      return adapterFailure(
        "fetch",
        "CATALOG_MASTER_SOURCE_URL_NOT_CONFIGURED",
        "CATALOG_MASTER_SOURCE_URL is required for catalog master JSON API ingestion",
      );
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": "MotorCart-CatalogMaster/1.0",
    };
    if (config.apiKey) {
      headers.Authorization = `Bearer ${config.apiKey}`;
      headers["X-API-Key"] = config.apiKey;
    }

    const fetchImpl = getFetchImpl(context);
    let response: Awaited<ReturnType<CatalogMasterFetchImpl>>;
    try {
      response = await fetchImpl(config.sourceUrl, {
        method: "GET",
        headers,
      });
    } catch (error) {
      return adapterFailure(
        "fetch",
        "CATALOG_MASTER_FETCH_FAILED",
        error instanceof Error ? error.message : "Catalog master fetch failed",
      );
    }

    if (response.status === 401 || response.status === 403) {
      return adapterFailure(
        "fetch",
        "CATALOG_MASTER_AUTH_FAILED",
        `Catalog master API authentication failed (HTTP ${response.status})`,
        { details: { status: response.status } },
      );
    }

    if (!response.ok) {
      return adapterFailure(
        "fetch",
        "CATALOG_MASTER_FETCH_FAILED",
        `Catalog master API returned HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`,
        { details: { status: response.status } },
      );
    }

    let raw: unknown;
    try {
      raw = await response.json();
    } catch {
      return adapterFailure(
        "fetch",
        "CATALOG_MASTER_MALFORMED_RESPONSE",
        "Catalog master API response is not valid JSON",
      );
    }

    const listingCheck = isListingShapedPayload(raw);
    if (listingCheck.rejected) {
      return adapterFailure(
        "fetch",
        "LISTING_SHAPED_PAYLOAD_REJECTED",
        `Catalog master payload looks like dealer inventory/listings (forbidden field: ${listingCheck.fieldPath}). Use OEM/licensed new-vehicle master data only.`,
        { details: { fieldPath: listingCheck.fieldPath } },
      );
    }

    const mapped = catalogMasterPayloadToImportRecords(raw);
    if (mapped.issues.length > 0 && mapped.records.length === 0) {
      return adapterFailure(
        "fetch",
        "CATALOG_MASTER_MALFORMED_RESPONSE",
        mapped.issues.join("; "),
        { details: { issues: mapped.issues } },
      );
    }

    const records = stampSourceClassification(mapped.records, config);
    context.metadata[CATALOG_MASTER_PAYLOAD_KEY] = raw;
    context.setNormalized({ recordCount: records.length, records });

    const serialized = JSON.stringify(raw);
    const fetchPayload = {
      raw,
      recordCount: records.length,
      fetchedAt: new Date().toISOString(),
      byteLength: Buffer.byteLength(serialized, "utf8"),
    };
    context.setFetch(fetchPayload);

    const warnings = mapped.issues.length ? mapped.issues : undefined;
    return adapterSuccess("fetch", fetchPayload, { warnings });
  }

  async validate(
    context: AdapterContext,
  ): Promise<AdapterResult<import("../adapter-types").AdapterValidationReport>> {
    const records = context.records;
    const issues: import("../adapter-types").AdapterError[] = [];

    if (!records.length) {
      issues.push({
        code: "EMPTY_PAYLOAD",
        message: "Catalog master payload produced zero records",
        stage: "validate",
      });
    }

    for (const record of records) {
      const brand = String(record.fields.brand ?? "").trim();
      const model = String(record.fields.model ?? "").trim();
      const variant = String(record.fields.variant ?? "").trim();
      if (!brand || !model || !variant) {
        issues.push({
          code: "ROW_INCOMPLETE",
          message: "Catalog master row missing brand, model, or variant",
          stage: "validate",
          details: { rowNumber: record.rowNumber },
        });
      }
    }

    const report = {
      valid: issues.length === 0,
      recordCount: records.length,
      issues,
    };
    context.setValidation(report);
    return adapterSuccess("validate", report, {
      metadata: { deferredToPipeline: true },
      warnings: issues.length ? ["Adapter validate found issues; pipeline validation will apply"] : undefined,
    });
  }

  async normalize(
    context: AdapterContext,
  ): Promise<AdapterResult<import("../adapter-types").AdapterNormalizeReport>> {
    if (context.records.length > 0) {
      const report = { recordCount: context.records.length, records: [...context.records] };
      context.setNormalized(report);
      return adapterSuccess("normalize", report);
    }

    const raw = context.metadata[CATALOG_MASTER_PAYLOAD_KEY] ?? context.fetch?.raw;
    if (raw === undefined) {
      return adapterFailure(
        "normalize",
        "CATALOG_MASTER_MALFORMED_RESPONSE",
        "No catalog master payload available to normalize",
      );
    }

    const mapped = catalogMasterPayloadToImportRecords(raw);
    if (mapped.issues.length > 0 && mapped.records.length === 0) {
      return adapterFailure(
        "normalize",
        "CATALOG_MASTER_MALFORMED_RESPONSE",
        mapped.issues.join("; "),
      );
    }

    const config = resolveCatalogMasterJsonApiConfig(readConfigOverrides(context));
    const records = stampSourceClassification(mapped.records, config);
    const report = { recordCount: records.length, records };
    context.setNormalized(report);
    return adapterSuccess("normalize", report);
  }

  async disconnect(context: AdapterContext): Promise<AdapterResult<void>> {
    if (context.connection) {
      context.setConnection({ ...context.connection, connected: false });
    }
    return adapterSuccess("disconnect", undefined);
  }
}
