import type { SelectorRegistry } from "../selectors/selector-registry";
import type { DomInteractionPort, DomQueryPort, PomNavigationPort } from "../dom/dom-ports";
import { readText } from "../dom/dom-ports";
import {
  GAADI_BAZAAR_MOCK_URL_RESOLVER,
  type GaadiBazaarUrlResolver,
  type VehicleCardSummary,
} from "../pom-types";

export type GaadiBazaarListingPageDeps = {
  dom: DomQueryPort;
  selectors: SelectorRegistry;
  navigation: PomNavigationPort;
  interaction: DomInteractionPort;
  urls?: GaadiBazaarUrlResolver;
};

/** GaadiBazaar listing/results page object (Phase 4D). */
export class GaadiBazaarListingPage {
  private readonly selectors;
  private readonly urls: GaadiBazaarUrlResolver;

  constructor(private readonly deps: GaadiBazaarListingPageDeps) {
    this.selectors = deps.selectors.listing;
    this.urls = deps.urls ?? GAADI_BAZAAR_MOCK_URL_RESOLVER;
  }

  async open(query?: string, city?: string): Promise<void> {
    const url = this.urls.listing(query, city);
    await this.deps.navigation.goto(url);
  }

  async goToNextPage(): Promise<void> {
    await this.deps.interaction.click(this.selectors.nextPageButton);
  }

  getVehicleCards(): VehicleCardSummary[] {
    const cards = this.deps.dom.queryAll(this.selectors.vehicleCard);
    return cards.map((card, index) => ({
      index,
      title: card.attributes["data-title"] ?? card.text,
      href: card.attributes["data-href"] ?? "",
      priceText: card.attributes["data-price"] ?? null,
      locationText: card.attributes["data-location"] ?? null,
      imageUrl: card.attributes["data-image"] ?? null,
      fuelText: card.attributes["data-fuel"] ?? null,
      transmissionText: card.attributes["data-transmission"] ?? null,
    }));
  }

  async openVehicle(index: number): Promise<string | null> {
    const cards = this.getVehicleCards();
    const card = cards[index];
    if (!card?.href) return null;
    await this.deps.navigation.goto(card.href);
    return card.href;
  }

  getCurrentPageNumber(): string | null {
    return readText(this.deps.dom, this.selectors.paginationCurrent);
  }

  hasResults(): boolean {
    return this.deps.dom.exists(this.selectors.resultsContainer) && this.getVehicleCards().length > 0;
  }

  isEmpty(): boolean {
    return this.deps.dom.exists(this.selectors.emptyState);
  }

  getCurrentUrl(): string {
    return this.deps.navigation.getCurrentUrl();
  }
}

export function createGaadiBazaarListingPage(deps: GaadiBazaarListingPageDeps): GaadiBazaarListingPage {
  return new GaadiBazaarListingPage(deps);
}
