import { adapterFailure } from "./adapter-types";
import type { AdapterContext } from "./adapter-context";
import type { SourceAdapter } from "./source-adapter";
import {
  SOURCE_ADAPTER_DISPLAY_NAMES,
  type AdapterResult,
  type SourceAdapterKind,
} from "./adapter-types";

/** Base adapter with NOT_IMPLEMENTED stubs for Phase 4A framework sources. */
export abstract class BaseSourceAdapter implements SourceAdapter {
  abstract readonly sourceId: SourceAdapterKind;

  get displayName(): string {
    return SOURCE_ADAPTER_DISPLAY_NAMES[this.sourceId];
  }

  protected notImplemented<T>(stage: import("./adapter-types").SourceAdapterStage): AdapterResult<T> {
    return adapterFailure(
      stage,
      "NOT_IMPLEMENTED",
      `${this.displayName} adapter is not implemented yet (Phase 4A framework only)`,
      { details: { sourceId: this.sourceId } },
    );
  }

  connect(_context: AdapterContext): Promise<AdapterResult<import("./adapter-types").AdapterConnectionInfo>> {
    return Promise.resolve(this.notImplemented("connect"));
  }

  fetch(_context: AdapterContext): Promise<AdapterResult<import("./adapter-types").AdapterFetchPayload>> {
    return Promise.resolve(this.notImplemented("fetch"));
  }

  validate(_context: AdapterContext): Promise<AdapterResult<import("./adapter-types").AdapterValidationReport>> {
    return Promise.resolve(this.notImplemented("validate"));
  }

  normalize(_context: AdapterContext): Promise<AdapterResult<import("./adapter-types").AdapterNormalizeReport>> {
    return Promise.resolve(this.notImplemented("normalize"));
  }

  disconnect(_context: AdapterContext): Promise<AdapterResult<void>> {
    return Promise.resolve(this.notImplemented("disconnect"));
  }
}

export class CarDekhoAdapter extends BaseSourceAdapter {
  readonly sourceId = "cardekho" as const;
}

export class OemFeedAdapter extends BaseSourceAdapter {
  readonly sourceId = "oem_feed" as const;
}

export class CsvSourceAdapter extends BaseSourceAdapter {
  readonly sourceId = "csv" as const;
}

export class ExcelSourceAdapter extends BaseSourceAdapter {
  readonly sourceId = "excel" as const;
}

export class DealerUploadAdapter extends BaseSourceAdapter {
  readonly sourceId = "dealer_upload" as const;
}

/** @deprecated Use `./json-api/json-api.adapter` — kept only to avoid accidental reintro of stub. */
export { JsonApiSourceAdapter } from "./json-api/json-api.adapter";
