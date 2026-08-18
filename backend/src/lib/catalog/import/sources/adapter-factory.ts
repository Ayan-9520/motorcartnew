import { AdapterContext } from "./adapter-context";
import type { AdapterRunOptions, SourceAdapterKind } from "./adapter-types";
import type { SourceAdapter } from "./source-adapter";
import { defaultSourceRegistry, SourceRegistry } from "./source-registry";

/** Creates source adapter instances from the registry. */
export class AdapterFactory {
  constructor(private readonly registry: SourceRegistry = defaultSourceRegistry) {}

  create(sourceId: SourceAdapterKind): SourceAdapter {
    const Ctor = this.registry.get(sourceId);
    return new Ctor();
  }

  createContext(sourceId: SourceAdapterKind, options?: AdapterRunOptions, runId?: string): AdapterContext {
    return AdapterContext.create(sourceId, options, runId);
  }

  createWithContext(sourceId: SourceAdapterKind, options?: AdapterRunOptions, runId?: string): {
    adapter: SourceAdapter;
    context: AdapterContext;
  } {
    return {
      adapter: this.create(sourceId),
      context: this.createContext(sourceId, options, runId),
    };
  }

  listSources(): SourceAdapterKind[] {
    return this.registry.list();
  }
}

export function createAdapterFactory(registry?: SourceRegistry): AdapterFactory {
  return new AdapterFactory(registry ?? defaultSourceRegistry);
}

export function createSourceAdapter(sourceId: SourceAdapterKind, registry?: SourceRegistry): SourceAdapter {
  return createAdapterFactory(registry).create(sourceId);
}
