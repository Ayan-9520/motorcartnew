import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GAADI_BAZAAR_MOCK_URLS } from "../pom/pom-types";
import type { PomNavigationPort } from "../pom/dom/dom-ports";
import { InMemoryDomInteraction } from "../pom/dom/dom-ports";
import { createGaadiBazaarPomBundle, type GaadiBazaarPomBundle } from "../pom";
import { MutableDomQueryPort } from "./scraper-session";

const FIXTURE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../pom/fixtures/html");

export type FixturePageRegistry = Map<string, string>;

export function loadFixtureHtmlMap(): FixturePageRegistry {
  const files: Record<string, string> = {
    [GAADI_BAZAAR_MOCK_URLS.home]: "home.html",
    [GAADI_BAZAAR_MOCK_URLS.listing]: "listing.html",
    "mock://gaadi-bazaar/listing?page=2": "listing-page-2.html",
    [GAADI_BAZAAR_MOCK_URLS.vehicle("gb-creta-12345")]: "vehicle.html",
    [GAADI_BAZAAR_MOCK_URLS.vehicle("gb-swift-67890")]: "vehicle-swift.html",
    [GAADI_BAZAAR_MOCK_URLS.vehicle("gb-nexon-11111")]: "vehicle-nexon.html",
  };

  const map: FixturePageRegistry = new Map();
  for (const [url, file] of Object.entries(files)) {
    map.set(url, fs.readFileSync(path.join(FIXTURE_DIR, file), "utf8"));
  }
  return map;
}

export function normalizeScraperUrl(url: string): string {
  const withoutQuery = url.split("?")[0] ?? url;
  return withoutQuery.replace(/\/$/, "");
}

export function resolveFixtureHtml(url: string, registry: FixturePageRegistry): string | null {
  const resolvedUrl = resolveFixtureUrl(url, registry);
  return resolvedUrl ? registry.get(resolvedUrl)! : null;
}

/** Maps a navigation URL to the fixture registry key (handles query strings). */
export function resolveFixtureUrl(url: string, registry: FixturePageRegistry): string | null {
  if (registry.has(url)) return url;

  const page2Key = "mock://gaadi-bazaar/listing?page=2";
  if (url.includes("page=2") && registry.has(page2Key)) {
    return page2Key;
  }

  const normalized = normalizeScraperUrl(url);
  if (registry.has(normalized)) return normalized;

  if (normalized === GAADI_BAZAAR_MOCK_URLS.listing && registry.has(GAADI_BAZAAR_MOCK_URLS.listing)) {
    return GAADI_BAZAAR_MOCK_URLS.listing;
  }

  return null;
}

export type ScraperSessionBundle = {
  dom: MutableDomQueryPort;
  navigation: PomNavigationPort;
  interaction: InMemoryDomInteraction;
  pom: GaadiBazaarPomBundle;
};

/** Navigation that serves mock HTML fixtures (no external network). */
export class FixtureScraperNavigation implements PomNavigationPort {
  private currentUrl: string = GAADI_BAZAAR_MOCK_URLS.listing;
  private listingPage = 1;

  constructor(
    private readonly registry: FixturePageRegistry,
    private readonly onPageLoad: (url: string, html: string) => void,
  ) {}

  async goto(url: string): Promise<void> {
    this.currentUrl = url;
    if (url.includes("page=2")) this.listingPage = 2;
    const html = resolveFixtureHtml(url, this.registry);
    if (!html) {
      throw { code: "SCRAPE_NAV_FAILED", message: `No fixture registered for URL: ${url}`, retryable: true };
    }
    this.onPageLoad(url, html);
  }

  getCurrentUrl(): string {
    return this.currentUrl;
  }

  getListingPage(): number {
    return this.listingPage;
  }

  markNextListingPage(): void {
    this.listingPage += 1;
    this.currentUrl = `${GAADI_BAZAAR_MOCK_URLS.listing}?page=${this.listingPage}`;
  }
}

export function createFixtureScraperSession(registry?: FixturePageRegistry): ScraperSessionBundle {
  const fixtureRegistry = registry ?? loadFixtureHtmlMap();
  const initialHtml = fixtureRegistry.get(GAADI_BAZAAR_MOCK_URLS.listing) ?? "<html></html>";
  const dom = new MutableDomQueryPort(initialHtml);
  const interaction = new InMemoryDomInteraction();

  const navigation = new FixtureScraperNavigation(fixtureRegistry, (_url, html) => {
    dom.reload(html);
  });

  const pom = createGaadiBazaarPomBundle({ dom, navigation, interaction });

  return { dom, navigation, interaction, pom };
}
