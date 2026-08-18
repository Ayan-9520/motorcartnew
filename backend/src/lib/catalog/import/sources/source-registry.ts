import type { SourceAdapterConstructor } from "./source-adapter";
import {
  CarDekhoAdapter,
  CsvSourceAdapter,
  DealerUploadAdapter,
  ExcelSourceAdapter,
  OemFeedAdapter,
} from "./placeholder-adapters";
import { GaadiBazaarAdapter } from "./gaadi-bazaar/gaadi-bazaar.adapter";
import { JsonApiSourceAdapter } from "./json-api/json-api.adapter";
import type { SourceAdapterKind } from "./adapter-types";

const DEFAULT_ADAPTER_MAP: Record<SourceAdapterKind, SourceAdapterConstructor> = {
  gaadi_bazaar: GaadiBazaarAdapter,
  cardekho: CarDekhoAdapter,
  oem_feed: OemFeedAdapter,
  csv: CsvSourceAdapter,
  excel: ExcelSourceAdapter,
  dealer_upload: DealerUploadAdapter,
  json_api: JsonApiSourceAdapter,
};

/** Registry of catalog source adapter constructors. */
export class SourceRegistry {
  private readonly adapters = new Map<SourceAdapterKind, SourceAdapterConstructor>();

  constructor(seedDefaults = true) {
    if (seedDefaults) {
      this.registerDefaults();
    }
  }

  register(sourceId: SourceAdapterKind, ctor: SourceAdapterConstructor): void {
    this.adapters.set(sourceId, ctor);
  }

  unregister(sourceId: SourceAdapterKind): boolean {
    return this.adapters.delete(sourceId);
  }

  has(sourceId: SourceAdapterKind): boolean {
    return this.adapters.has(sourceId);
  }

  get(sourceId: SourceAdapterKind): SourceAdapterConstructor {
    const ctor = this.adapters.get(sourceId);
    if (!ctor) {
      throw new Error(`Source adapter not registered: ${sourceId}`);
    }
    return ctor;
  }

  list(): SourceAdapterKind[] {
    return [...this.adapters.keys()];
  }

  registerDefaults(): void {
    for (const [kind, ctor] of Object.entries(DEFAULT_ADAPTER_MAP) as Array<
      [SourceAdapterKind, SourceAdapterConstructor]
    >) {
      this.register(kind, ctor);
    }
  }
}

export const defaultSourceRegistry = new SourceRegistry(true);
