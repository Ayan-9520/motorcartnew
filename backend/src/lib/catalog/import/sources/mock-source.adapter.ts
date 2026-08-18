import { adapterSuccess } from "./adapter-types";
import type { AdapterContext } from "./adapter-context";
import { BaseSourceAdapter } from "./placeholder-adapters";
import type { AdapterResult, SourceAdapterKind } from "./adapter-types";

/** In-memory mock adapter for framework tests (not a production source). */
export class MockSourceAdapter extends BaseSourceAdapter {
  readonly sourceId: SourceAdapterKind;

  constructor(sourceId: SourceAdapterKind = "csv") {
    super();
    this.sourceId = sourceId;
  }

  override async connect(context: AdapterContext): Promise<AdapterResult<import("./adapter-types").AdapterConnectionInfo>> {
    const info = {
      connected: true,
      connectedAt: new Date().toISOString(),
      endpoint: `mock://${this.sourceId}`,
    };
    context.setConnection(info);
    return adapterSuccess("connect", info, { metadata: { mock: true } });
  }

  override async fetch(context: AdapterContext): Promise<AdapterResult<import("./adapter-types").AdapterFetchPayload>> {
    const payload = {
      raw: [{ brand: "Hyundai", model: "Creta" }],
      recordCount: 1,
      fetchedAt: new Date().toISOString(),
    };
    context.setFetch(payload);
    return adapterSuccess("fetch", payload, { metadata: { mock: true } });
  }

  override async validate(context: AdapterContext): Promise<AdapterResult<import("./adapter-types").AdapterValidationReport>> {
    const report = { valid: true, recordCount: 1, issues: [] };
    context.setValidation(report);
    return adapterSuccess("validate", report, { metadata: { mock: true } });
  }

  override async normalize(context: AdapterContext): Promise<AdapterResult<import("./adapter-types").AdapterNormalizeReport>> {
    const report = {
      recordCount: 1,
      records: [{ rowNumber: 1, segment: "car" as const, fields: { brand: "Hyundai", model: "Creta", variant: "SX" } }],
    };
    context.setNormalized(report);
    return adapterSuccess("normalize", report, { metadata: { mock: true } });
  }

  override async disconnect(context: AdapterContext): Promise<AdapterResult<void>> {
    if (context.connection) {
      context.setConnection({ ...context.connection, connected: false });
    }
    return adapterSuccess("disconnect", undefined, { metadata: { mock: true } });
  }
}
