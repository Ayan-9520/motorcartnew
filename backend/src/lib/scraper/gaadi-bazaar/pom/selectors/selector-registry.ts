import {
  DEFAULT_SELECTOR_VERSION,
  GAADI_BAZAAR_SELECTOR_MAPS,
  type GaadiBazaarSelectorMap,
  type SelectorVersion,
  isSelectorVersion,
} from "./selector-maps";

/** Resolves versioned GaadiBazaar selector maps for page objects. */
export class SelectorRegistry {
  private readonly map: GaadiBazaarSelectorMap;

  constructor(version: SelectorVersion = DEFAULT_SELECTOR_VERSION) {
    this.map = GAADI_BAZAAR_SELECTOR_MAPS[version];
  }

  static create(version?: SelectorVersion): SelectorRegistry {
    return new SelectorRegistry(version ?? DEFAULT_SELECTOR_VERSION);
  }

  static fromVersionString(version: string): SelectorRegistry {
    if (!isSelectorVersion(version)) {
      throw new Error(`Unsupported GaadiBazaar selector version: ${version}`);
    }
    return new SelectorRegistry(version);
  }

  get version(): SelectorVersion {
    return this.map.version;
  }

  get home(): GaadiBazaarSelectorMap["home"] {
    return this.map.home;
  }

  get listing(): GaadiBazaarSelectorMap["listing"] {
    return this.map.listing;
  }

  get vehicle(): GaadiBazaarSelectorMap["vehicle"] {
    return this.map.vehicle;
  }
}

export { DEFAULT_SELECTOR_VERSION, SUPPORTED_SELECTOR_VERSIONS } from "./selector-maps";
