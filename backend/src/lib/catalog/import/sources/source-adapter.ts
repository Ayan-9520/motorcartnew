import type { AdapterContext } from "./adapter-context";
import type { AdapterResult, SourceAdapterKind } from "./adapter-types";

/** Catalog import source adapter contract (Phase 4A — framework only). */
export interface SourceAdapter {
  readonly sourceId: SourceAdapterKind;
  readonly displayName: string;

  connect(context: AdapterContext): Promise<AdapterResult<import("./adapter-types").AdapterConnectionInfo>>;
  fetch(context: AdapterContext): Promise<AdapterResult<import("./adapter-types").AdapterFetchPayload>>;
  validate(context: AdapterContext): Promise<AdapterResult<import("./adapter-types").AdapterValidationReport>>;
  normalize(context: AdapterContext): Promise<AdapterResult<import("./adapter-types").AdapterNormalizeReport>>;
  disconnect(context: AdapterContext): Promise<AdapterResult<void>>;
}

export type SourceAdapterFactoryFn = (context?: AdapterContext) => SourceAdapter;

export type SourceAdapterConstructor = new () => SourceAdapter;
