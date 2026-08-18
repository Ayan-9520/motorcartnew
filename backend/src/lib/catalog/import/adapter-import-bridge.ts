import type { ImportContext } from "./import-context";
import { AdapterContext } from "./sources/adapter-context";
import type { AdapterRunOptions } from "./sources/adapter-types";
import type { SourceAdapterKind } from "./sources/adapter-types";

/** Bridges ImportContext and AdapterContext into one shared metadata surface. */
export class AdapterImportBridge {
  readonly importContext: ImportContext;
  readonly adapterContext: AdapterContext;

  constructor(importContext: ImportContext, sourceId: SourceAdapterKind, options?: AdapterRunOptions) {
    this.importContext = importContext;
    this.adapterContext = AdapterContext.create(sourceId, {
      dryRun: importContext.dryRun,
      initiatedBy: importContext.initiatedBy ?? undefined,
      metadata: { ...importContext.metadata },
      ...options,
    });
  }

  syncAdapterToImport(): void {
    for (const [key, value] of Object.entries(this.adapterContext.metadata)) {
      this.importContext.metadata[key] = value;
    }
    for (const warning of this.adapterContext.warnings) {
      this.importContext.addWarning(warning);
    }
  }

  syncImportToAdapter(): void {
    for (const [key, value] of Object.entries(this.importContext.metadata)) {
      this.adapterContext.metadata[key] = value;
    }
  }
}

export function createAdapterImportBridge(
  importContext: ImportContext,
  sourceId: SourceAdapterKind,
  options?: AdapterRunOptions,
): AdapterImportBridge {
  return new AdapterImportBridge(importContext, sourceId, options);
}
