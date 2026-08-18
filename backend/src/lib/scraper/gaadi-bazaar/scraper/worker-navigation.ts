import type { PlaywrightWorker } from "../../../playwright-worker/playwright-worker";
import { InMemoryDomInteraction, type PomNavigationPort } from "../pom/dom/dom-ports";
import { GAADI_BAZAAR_MOCK_URLS, type GaadiBazaarUrlResolver } from "../pom/pom-types";
import { createGaadiBazaarPomBundle, type GaadiBazaarPomBundle } from "../pom";
import type { FixturePageRegistry, ScraperSessionBundle } from "./fixture-navigation";
import { loadFixtureHtmlMap, resolveFixtureUrl } from "./fixture-navigation";
import { MutableDomQueryPort } from "./scraper-session";
import { normalizeGaadiBazaarLiveHtml } from "./live/gaadi-bazaar-live-html-normalizer";
import { detectGaadiBazaarScrapeProtection } from "./live/gaadi-bazaar-scrape-guards";
import { buildGaadiBazaarLiveListingUrl } from "./live/gaadi-bazaar-live-urls";

export type WorkerScraperNavigationOptions = {
  live?: boolean;
  city?: string;
  search?: string;
};

/** Navigation backed by PlaywrightWorker HTML snapshots. */
export class WorkerScraperNavigation implements PomNavigationPort {
  private currentUrl = "about:blank";
  private taskCounter = 0;
  private listingPage = 1;

  constructor(
    private readonly worker: PlaywrightWorker,
    private readonly dom: MutableDomQueryPort,
    private readonly options: WorkerScraperNavigationOptions = {},
  ) {}

  async goto(url: string): Promise<void> {
    this.taskCounter += 1;
    const live = this.options.live === true;
    const registry = loadFixtureHtmlMap();
    const taskUrl = live ? url : (resolveFixtureUrl(url, registry) ?? url);
    const result = await this.worker.runTask({
      taskId: `gb-nav-${this.taskCounter}`,
      url: taskUrl,
      captureHtml: true,
      captureScreenshot: live,
    });

    if (!result.success || !result.htmlSnapshot?.content) {
      throw {
        code: "SCRAPE_NAV_FAILED",
        message: result.errors[0]?.message ?? `Navigation failed for ${url}`,
        retryable: true,
      };
    }

    let html = result.htmlSnapshot.content;
    const protection = detectGaadiBazaarScrapeProtection(html);
    if (protection) {
      throw {
        code: `SCRAPE_${protection.code}`,
        message: `${protection.message} URL=${url}`,
        retryable: false,
      };
    }

    if (live) {
      html = normalizeGaadiBazaarLiveHtml(html, url);
    }

    this.currentUrl = url;
    if (url.includes("page=2") || /[?&]page=2(?:&|$)/.test(url)) this.listingPage = 2;
    this.dom.reload(html);
  }

  getCurrentUrl(): string {
    return this.currentUrl;
  }

  getListingPage(): number {
    return this.listingPage;
  }

  markNextListingPage(): void {
    this.listingPage += 1;
    if (this.options.live) {
      this.currentUrl = buildGaadiBazaarLiveListingUrl({
        city: this.options.city ?? "Delhi",
        search: this.options.search,
        page: this.listingPage,
      });
      return;
    }
    this.currentUrl = `mock://gaadi-bazaar/listing?page=${this.listingPage}`;
  }
}

export function createWorkerScraperSession(
  worker: PlaywrightWorker,
  initialHtml = "<html><body></body></html>",
  options: WorkerScraperNavigationOptions = {},
): { dom: MutableDomQueryPort; navigation: WorkerScraperNavigation } {
  const dom = new MutableDomQueryPort(initialHtml);
  const navigation = new WorkerScraperNavigation(worker, dom, options);
  return { dom, navigation };
}

export function createWorkerScraperSessionBundle(
  worker: PlaywrightWorker,
  registry: FixturePageRegistry,
  options: {
    live?: boolean;
    city?: string;
    search?: string;
    urls?: GaadiBazaarUrlResolver;
  } = {},
): ScraperSessionBundle {
  const initialHtml = registry.get(GAADI_BAZAAR_MOCK_URLS.listing) ?? "<html></html>";
  const dom = new MutableDomQueryPort(options.live ? "<html></html>" : initialHtml);
  const navigation = new WorkerScraperNavigation(worker, dom, {
    live: options.live,
    city: options.city,
    search: options.search,
  });
  const interaction = new InMemoryDomInteraction();
  const pom = createGaadiBazaarPomBundle({
    dom,
    navigation,
    interaction,
    urls: options.urls,
  });
  return { dom, navigation, interaction, pom };
}
