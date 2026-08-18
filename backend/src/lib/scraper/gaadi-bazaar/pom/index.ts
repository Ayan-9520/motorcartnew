export * from "./pom-types";
export * from "./selectors/selector-maps";
export * from "./selectors/selector-registry";
export * from "./dom/dom-ports";
export * from "./dom/html-dom-query";
export * from "./pages/gaadi-bazaar-home-page";
export * from "./pages/gaadi-bazaar-listing-page";
export * from "./pages/gaadi-bazaar-vehicle-page";

import type { DomInteractionPort, DomQueryPort, PomNavigationPort } from "./dom/dom-ports";
import { SelectorRegistry } from "./selectors/selector-registry";
import { GaadiBazaarHomePage } from "./pages/gaadi-bazaar-home-page";
import { GaadiBazaarListingPage } from "./pages/gaadi-bazaar-listing-page";
import { GaadiBazaarVehiclePage } from "./pages/gaadi-bazaar-vehicle-page";
import { GAADI_BAZAAR_MOCK_URL_RESOLVER, type GaadiBazaarUrlResolver } from "./pom-types";

export type GaadiBazaarPomBundle = {
  selectors: SelectorRegistry;
  navigation: PomNavigationPort;
  interaction: DomInteractionPort;
  urls: GaadiBazaarUrlResolver;
  home: GaadiBazaarHomePage;
  listing: GaadiBazaarListingPage;
  vehicle: GaadiBazaarVehiclePage;
};

export function createGaadiBazaarPomBundle(options: {
  dom: DomQueryPort;
  navigation: PomNavigationPort;
  interaction: DomInteractionPort;
  selectorVersion?: import("./selectors/selector-maps").SelectorVersion;
  urls?: GaadiBazaarUrlResolver;
}): GaadiBazaarPomBundle {
  const selectors = SelectorRegistry.create(options.selectorVersion);
  const urls = options.urls ?? GAADI_BAZAAR_MOCK_URL_RESOLVER;
  const shared = { dom: options.dom, selectors, navigation: options.navigation, urls };
  return {
    selectors,
    navigation: options.navigation,
    interaction: options.interaction,
    urls,
    home: new GaadiBazaarHomePage({ ...shared, interaction: options.interaction }),
    listing: new GaadiBazaarListingPage({ ...shared, interaction: options.interaction }),
    vehicle: new GaadiBazaarVehiclePage(shared),
  };
}
