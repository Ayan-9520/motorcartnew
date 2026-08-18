import { AdapterContext } from "../adapter-context";
import {
  adapterFailure,
  adapterSuccess,
  SOURCE_ADAPTER_DISPLAY_NAMES,
  type AdapterResult,
  type AdapterRunOptions,
} from "../adapter-types";
import type { SourceAdapter } from "../source-adapter";
import {
  gaadiBazaarPayloadToImportRecords,
  mapGaadiBazaarPayload,
} from "./gaadi-bazaar-mapper";
import {
  GAADI_BAZAAR_PAYLOAD_KEY,
  type GaadiBazaarScraperPayload,
} from "./gaadi-bazaar-types";
import { trimCell } from "../../parser/value-normalizer";

export function getGaadiBazaarPayload(context: AdapterContext): GaadiBazaarScraperPayload | null {
  const fromMetadata = context.metadata[GAADI_BAZAAR_PAYLOAD_KEY] as GaadiBazaarScraperPayload | undefined;
  if (fromMetadata?.vehicles) return fromMetadata;

  const config = context.metadata.config as { payload?: GaadiBazaarScraperPayload } | undefined;
  if (config?.payload?.vehicles) return config.payload;

  return null;
}

/** Read-only GaadiBazaar source adapter — ingest only; validation/normalization run in unified pipeline. */
export class GaadiBazaarAdapter implements SourceAdapter {
  readonly sourceId = "gaadi_bazaar" as const;

  get displayName(): string {
    return SOURCE_ADAPTER_DISPLAY_NAMES.gaadi_bazaar;
  }

  async connect(context: AdapterContext): Promise<AdapterResult<import("../adapter-types").AdapterConnectionInfo>> {
    const payload = getGaadiBazaarPayload(context);
    if (!payload) {
      return adapterFailure(
        "connect",
        "PAYLOAD_MISSING",
        "GaadiBazaar scraper payload is required in context.metadata.scraperPayload (read-only — no HTTP fetch)",
      );
    }

    if (!Array.isArray(payload.vehicles)) {
      return adapterFailure("connect", "PAYLOAD_INVALID", "scraperPayload.vehicles must be an array");
    }

    const info = {
      connected: true,
      connectedAt: new Date().toISOString(),
      endpoint: "read-only://gaadi-bazaar/scraper-payload",
      metadata: {
        vehicleCount: payload.vehicles.length,
        scrapedAt: payload.scrapedAt ?? null,
      },
    };
    context.setConnection(info);
    return adapterSuccess("connect", info, { metadata: { readOnly: true } });
  }

  async fetch(context: AdapterContext): Promise<AdapterResult<import("../adapter-types").AdapterFetchPayload>> {
    const payload = getGaadiBazaarPayload(context);
    if (!payload) {
      return adapterFailure("fetch", "PAYLOAD_MISSING", "No scraper payload available");
    }

    const serialized = JSON.stringify(payload);
    const fetchPayload = {
      raw: payload,
      recordCount: payload.vehicles.length,
      fetchedAt: payload.scrapedAt ?? new Date().toISOString(),
      byteLength: Buffer.byteLength(serialized, "utf8"),
    };
    context.setFetch(fetchPayload);
    return adapterSuccess("fetch", fetchPayload, { metadata: { readOnly: true } });
  }

  async validate(context: AdapterContext): Promise<AdapterResult<import("../adapter-types").AdapterValidationReport>> {
    const payload = getGaadiBazaarPayload(context);
    if (!payload) {
      return adapterFailure("validate", "PAYLOAD_MISSING", "No scraper payload to validate");
    }

    const issues: import("../adapter-types").AdapterError[] = [];
    if (!payload.vehicles.length) {
      issues.push({
        code: "EMPTY_PAYLOAD",
        message: "scraperPayload.vehicles is empty",
        stage: "validate",
      });
    }

    payload.vehicles.forEach((vehicle, index) => {
      const rowNumber = index + 1;
      const brand = trimCell(vehicle.brand);
      const model = trimCell(vehicle.model);
      if (!brand && !model && !trimCell(vehicle.vehicleTitle)) {
        issues.push({
          code: "ROW_EMPTY",
          message: "Vehicle row has no brand, model, or title",
          stage: "validate",
          details: { rowNumber },
        });
      }
    });

    const mapped = mapGaadiBazaarPayload(payload);
    for (const row of mapped) {
      for (const issue of row.issues) {
        issues.push({
          code: "NORMALIZE_PREVIEW",
          message: issue,
          stage: "validate",
          details: { rowNumber: row.rowNumber },
        });
      }
    }

    const report = {
      valid: issues.length === 0,
      recordCount: payload.vehicles.length,
      issues,
    };
    context.setValidation(report);
    return adapterSuccess("validate", report, { metadata: { deferredToPipeline: true } });
  }

  async normalize(context: AdapterContext): Promise<AdapterResult<import("../adapter-types").AdapterNormalizeReport>> {
    const payload = getGaadiBazaarPayload(context);
    if (!payload) {
      return adapterFailure("normalize", "PAYLOAD_MISSING", "No scraper payload to normalize");
    }

    const records = gaadiBazaarPayloadToImportRecords(payload);
    const report = { recordCount: records.length, records };
    context.setNormalized(report);
    return adapterSuccess("normalize", report, { metadata: { readOnly: true, rawOnly: true } });
  }

  async disconnect(context: AdapterContext): Promise<AdapterResult<void>> {
    if (context.connection) {
      context.setConnection({ ...context.connection, connected: false });
    }
    return adapterSuccess("disconnect", undefined, { metadata: { readOnly: true } });
  }
}

export function createGaadiBazaarContext(
  payload: GaadiBazaarScraperPayload,
  options?: AdapterRunOptions,
): AdapterContext {
  const context = AdapterContext.create("gaadi_bazaar", options);
  context.metadata[GAADI_BAZAAR_PAYLOAD_KEY] = payload;
  return context;
}
