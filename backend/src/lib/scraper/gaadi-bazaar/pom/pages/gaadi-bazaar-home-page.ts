import type { SelectorRegistry } from "../selectors/selector-registry";
import { resolveSelectorTemplate } from "../selectors/selector-maps";
import type { DomInteractionPort, DomQueryPort, PomNavigationPort } from "../dom/dom-ports";
import { readText } from "../dom/dom-ports";
import { GAADI_BAZAAR_MOCK_URL_RESOLVER, type GaadiBazaarUrlResolver } from "../pom-types";

export type GaadiBazaarHomePageDeps = {
  dom: DomQueryPort;
  selectors: SelectorRegistry;
  navigation: PomNavigationPort;
  interaction: DomInteractionPort;
  urls?: GaadiBazaarUrlResolver;
};

/** GaadiBazaar home page object — methods only, no scraping persistence (Phase 4D). */
export class GaadiBazaarHomePage {
  private readonly selectors;
  private readonly urls: GaadiBazaarUrlResolver;

  constructor(private readonly deps: GaadiBazaarHomePageDeps) {
    this.selectors = deps.selectors.home;
    this.urls = deps.urls ?? GAADI_BAZAAR_MOCK_URL_RESOLVER;
  }

  async open(): Promise<void> {
    await this.deps.navigation.goto(this.urls.home());
  }

  async search(query: string): Promise<void> {
    await this.deps.interaction.fill(this.selectors.searchInput, query);
    await this.deps.interaction.click(this.selectors.searchButton);
  }

  async selectCity(city: string): Promise<void> {
    const optionSelector = resolveSelectorTemplate(this.selectors.cityOptionTemplate, {
      city: city.trim().toLowerCase(),
    });
    await this.deps.interaction.selectOption(this.selectors.citySelect, city);
    if (this.deps.dom.exists(optionSelector)) {
      await this.deps.interaction.click(optionSelector);
    }
  }

  getHeroBannerText(): string | null {
    return readText(this.deps.dom, this.selectors.heroBanner);
  }

  isSearchReady(): boolean {
    return this.deps.dom.exists(this.selectors.searchInput) && this.deps.dom.exists(this.selectors.searchButton);
  }

  getCurrentUrl(): string {
    return this.deps.navigation.getCurrentUrl();
  }
}

export function createGaadiBazaarHomePage(deps: GaadiBazaarHomePageDeps): GaadiBazaarHomePage {
  return new GaadiBazaarHomePage(deps);
}
