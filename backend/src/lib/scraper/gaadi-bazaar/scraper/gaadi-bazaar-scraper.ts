import type { GaadiBazaarScraperPayload } from "../../../catalog/import/sources/gaadi-bazaar/gaadi-bazaar-types";
import { RetryPolicy } from "../../../playwright-worker/retry-policy";
import { createWorkerLogger, type WorkerLogger } from "../../../playwright-worker/worker-logger";
import type { GaadiBazaarPomBundle } from "../pom";
import type { VehicleCardSummary } from "../pom/pom-types";
import { mergeScraperConfig, type GaadiBazaarScraperConfig } from "./scraper-config";
import type {
  GaadiBazaarScrapeError,
  GaadiBazaarScrapeOptions,
  GaadiBazaarScrapeResult,
  GaadiBazaarScrapeStats,
} from "./scraper-types";
import {
  extractVehicleFromDetailPage,
  isExtractedVehicleComplete,
} from "./vehicle-field-extractor";
import type { ScraperSessionBundle } from "./fixture-navigation";

export type GaadiBazaarScraperDeps = {
  session: ScraperSessionBundle;
  config?: Partial<GaadiBazaarScraperConfig>;
  logger?: WorkerLogger;
};

/** Read-only GaadiBazaar scraper — produces GaadiBazaarScraperPayload (Phase 4E). */
export class GaadiBazaarScraper {
  private readonly config: GaadiBazaarScraperConfig;
  private readonly logger: WorkerLogger;
  private readonly retryPolicy: RetryPolicy;

  constructor(private readonly deps: GaadiBazaarScraperDeps) {
    this.config = mergeScraperConfig(deps.config);
    this.logger = deps.logger ?? createWorkerLogger("GaadiBazaarScraper");
    this.retryPolicy = new RetryPolicy(this.config.retry);
  }

  get pom(): GaadiBazaarPomBundle {
    return this.deps.session.pom;
  }

  async scrape(options: GaadiBazaarScrapeOptions = {}): Promise<GaadiBazaarScrapeResult> {
    const started = Date.now();
    const errors: GaadiBazaarScrapeError[] = [];
    const vehicles: GaadiBazaarScraperPayload["vehicles"] = [];
    let listingPagesVisited = 0;
    let vehicleCardsSeen = 0;
    let vehiclesFailed = 0;
    let retries = 0;

    const maxPages = options.maxListingPages ?? this.config.maxListingPages;
    const maxVehicles = options.maxVehicles ?? this.config.maxVehicles;

    this.logger.info("Scrape started", { query: options.query, maxPages, maxVehicles });

    // Live mode encodes city+search in the listing URL; skip mock home city UI.
    if (options.city && this.config.urlMode !== "live") {
      await this.pom.home.open();
      await this.pom.home.selectCity(options.city);
    }

    await this.pom.listing.open(options.query, options.city);

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      listingPagesVisited += 1;
      const listingUrl = this.pom.listing.getCurrentUrl();
      const cards = this.pom.listing.getVehicleCards();
      vehicleCardsSeen += cards.length;

      this.logger.info("Listing page loaded", {
        pageNum,
        cardCount: cards.length,
        url: this.pom.listing.getCurrentUrl(),
      });

      if (cards.length === 0 && this.config.stopWhenListingEmpty) {
        this.logger.info("Listing empty — stopping pagination");
        break;
      }

      for (const card of cards) {
        if (vehicles.length >= maxVehicles) break;

        try {
          const vehicle = await this.scrapeVehicleCard(card, listingUrl, (attempt) => {
            retries += attempt > 1 ? 1 : 0;
          });
          if (isExtractedVehicleComplete(vehicle)) {
            vehicles.push(vehicle);
          } else {
            vehiclesFailed += 1;
            errors.push({
              code: "SCRAPE_INCOMPLETE",
              message: "Vehicle detail missing required fields",
              vehicleUrl: card.href,
              pageNumber: pageNum,
            });
          }
        } catch (err) {
          vehiclesFailed += 1;
          errors.push(normalizeScrapeError(err, card.href, pageNum));
        }
      }

      if (vehicles.length >= maxVehicles) break;
      if (pageNum >= maxPages) break;
      if (!this.canPaginate()) break;

      await this.goToNextListingPage();
    }

    const payload: GaadiBazaarScraperPayload = {
      segment: options.segment,
      source: "gaadi_bazaar",
      scrapedAt: new Date().toISOString(),
      vehicles,
    };

    const stats: GaadiBazaarScrapeStats = {
      listingPagesVisited,
      vehicleCardsSeen,
      vehiclesExtracted: vehicles.length,
      vehiclesFailed,
      retries,
      durationMs: Date.now() - started,
    };

    this.logger.info("Scrape finished", stats as unknown as Record<string, unknown>);

    return { payload, errors, stats };
  }

  private async scrapeVehicleCard(
    card: VehicleCardSummary,
    listingUrl: string,
    onRetry?: (attempt: number) => void,
  ) {
    const execution = await this.retryPolicy.execute(async () => {
      await this.pom.vehicle.openByUrl(card.href);
      const extracted = extractVehicleFromDetailPage(this.pom.vehicle, card);
      await this.deps.session.navigation.goto(listingUrl);
      if (!isExtractedVehicleComplete(extracted)) {
        throw {
          code: "SCRAPE_EXTRACT_FAILED",
          message: `Incomplete extraction for ${card.href}`,
          retryable: true,
        };
      }
      return extracted;
    }, onRetry ? (_error, attempt) => onRetry(attempt) : undefined);

    return execution.value;
  }

  private canPaginate(): boolean {
    const selectors = this.pom.selectors.listing;
    if (this.config.urlMode === "live") {
      return this.deps.session.dom.exists(selectors.nextPageButton);
    }
    const nav = this.deps.session.navigation;
    const onLastFixturePage =
      "getListingPage" in nav && typeof nav.getListingPage === "function"
        ? nav.getListingPage() >= 2
        : false;
    return !onLastFixturePage && this.deps.session.dom.exists(selectors.nextPageButton);
  }

  private async goToNextListingPage(): Promise<void> {
    const nav = this.deps.session.navigation;
    await this.pom.listing.goToNextPage();
    if ("markNextListingPage" in nav && typeof nav.markNextListingPage === "function") {
      nav.markNextListingPage();
      await nav.goto(nav.getCurrentUrl());
    }
  }
}

function normalizeScrapeError(err: unknown, vehicleUrl?: string, pageNumber?: number): GaadiBazaarScrapeError {
  if (typeof err === "object" && err !== null && "code" in err && "message" in err) {
    const e = err as GaadiBazaarScrapeError;
    return { ...e, vehicleUrl: e.vehicleUrl ?? vehicleUrl, pageNumber: e.pageNumber ?? pageNumber };
  }
  return {
    code: "SCRAPE_ERROR",
    message: err instanceof Error ? err.message : String(err),
    vehicleUrl,
    pageNumber,
    retryable: false,
  };
}

export async function scrapeGaadiBazaarPayload(
  deps: GaadiBazaarScraperDeps,
  options?: GaadiBazaarScrapeOptions,
): Promise<GaadiBazaarScrapeResult> {
  const scraper = new GaadiBazaarScraper(deps);
  return scraper.scrape(options);
}

export function createGaadiBazaarScraper(deps: GaadiBazaarScraperDeps): GaadiBazaarScraper {
  return new GaadiBazaarScraper(deps);
}
