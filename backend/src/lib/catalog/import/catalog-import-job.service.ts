import { randomUUID } from "node:crypto";
import {
  MockBrowserDriverFactory,
  PlaywrightBrowserDriverFactory,
  PlaywrightWorker,
  createWorkerLogger,
  type PlaywrightWorker as PlaywrightWorkerType,
} from "../../playwright-worker";
import {
  createFixtureScraperSession,
  createWorkerScraperSessionBundle,
  loadFixtureHtmlMap,
  scrapeGaadiBazaarPayload,
} from "../../scraper/gaadi-bazaar/scraper";
import {
  clearGaadiBazaarWorkerMockPages,
  registerGaadiBazaarWorkerMockPages,
} from "../../scraper/gaadi-bazaar/scraper/worker-mock-pages";
import { createGaadiBazaarLiveUrlResolver } from "../../scraper/gaadi-bazaar/pom/live-url-resolver";
import {
  GAADI_BAZAAR_ALLOWED_HOSTS,
  buildGaadiBazaarLiveListingUrl,
} from "../../scraper/gaadi-bazaar/scraper/live/gaadi-bazaar-live-urls";
import { checkGaadiBazaarRobots } from "../../scraper/gaadi-bazaar/scraper/live/gaadi-bazaar-robots";
import { runGaadiBazaarCatalogImport } from "./catalog-import.service";
import { runCatalogMasterJsonApiDryRun } from "./catalog-master-json-api.service";
import {
  buildExecutionReport,
  buildPerformanceReport,
  buildStageTiming,
  importStageTimings,
  stageLabel,
} from "./catalog-import-job-report";
import type {
  CatalogImportJobInput,
  CatalogImportJobResult,
  CatalogImportJobStageTiming,
} from "./catalog-import-job.types";

export type CatalogImportJobOptions = {
  worker?: PlaywrightWorkerType;
  logger?: ReturnType<typeof createWorkerLogger>;
  /** Injected media downloader (Phase 5G real URL fetch). */
  mediaDownloader?: import("./media/media-types").MediaDownloader;
  /** Injected storage provider (Phase 5G R2/S3 — never local for production media). */
  storageProvider?: import("../../storage/storage-types").StorageProvider;
};

function resolveJobId(input: CatalogImportJobInput): string {
  return input.jobId ?? `catalog-import-${randomUUID()}`;
}

function useWorkerPath(input: CatalogImportJobInput): boolean {
  return input.usePlaywrightWorker !== false;
}

function remapUploadAsAdapter(stages: CatalogImportJobStageTiming[]): CatalogImportJobStageTiming[] {
  return stages.map((stage) =>
    stage.stage === "upload"
      ? {
          ...stage,
          stage: "gaadi_bazaar_adapter",
          label: stageLabel("gaadi_bazaar_adapter"),
        }
      : stage,
  );
}

async function initializeWorker(
  input: CatalogImportJobInput,
  options: CatalogImportJobOptions,
): Promise<{ worker: PlaywrightWorkerType; owned: boolean }> {
  if (options.worker) {
    await options.worker.initialize();
    return { worker: options.worker, owned: false };
  }

  const logger = options.logger ?? createWorkerLogger("CatalogImportJob");

  if (input.useRealBrowser) {
    const worker = new PlaywrightWorker({
      driverFactory: new PlaywrightBrowserDriverFactory({
        allowedUrlSchemes: ["https", "about"],
        allowedHosts: [...GAADI_BAZAAR_ALLOWED_HOSTS],
      }),
      logger,
      config: {
        allowedUrlSchemes: ["https", "about"],
        allowedHosts: [...GAADI_BAZAAR_ALLOWED_HOSTS],
        headless: true,
        defaultTimeoutMs: 45_000,
        captureScreenshotOnError: true,
        browserPoolSize: 1,
        contextPoolSize: 1,
        maxPagesPerContext: 1,
        rateLimit: { maxConcurrent: 1, minIntervalMs: 1_500 },
        randomDelay: { minMs: 500, maxMs: 1_500 },
        retry: {
          maxAttempts: 2,
          baseDelayMs: 1_000,
          maxDelayMs: 5_000,
          backoffMultiplier: 2,
          retryableCodes: ["TIMEOUT", "POOL_EXHAUSTED", "NAVIGATION_FAILED"],
        },
      },
    });
    await worker.initialize();
    return { worker, owned: true };
  }

  registerGaadiBazaarWorkerMockPages();
  const worker = new PlaywrightWorker({
    driverFactory: new MockBrowserDriverFactory(),
    logger,
    config: {
      randomDelay: { minMs: 0, maxMs: 0 },
      rateLimit: { maxConcurrent: 4, minIntervalMs: 0 },
    },
  });
  await worker.initialize();
  return { worker, owned: true };
}

async function shutdownWorker(
  worker: PlaywrightWorkerType | null,
  owned: boolean,
  usedRealBrowser: boolean,
): Promise<void> {
  if (!worker || !owned) return;
  await worker.shutdown();
  if (!usedRealBrowser) clearGaadiBazaarWorkerMockPages();
}

/**
 * End-to-end catalog import job (Phase 4F / 5F).
 * Playwright Worker → Scraper → Adapter → Import Pipeline (dry-run, no DB/publish).
 */
export async function runCatalogImportJob(
  input: CatalogImportJobInput,
  options: CatalogImportJobOptions = {},
): Promise<CatalogImportJobResult> {
  const jobId = resolveJobId(input);
  const jobStartedMs = Date.now();
  const stages: CatalogImportJobStageTiming[] = [];
  const live = input.useRealBrowser === true;

  let workerMs = 0;
  let scraperMs = 0;
  let importMs = 0;
  let worker: PlaywrightWorkerType | null = null;
  let workerOwned = false;

  if (input.source === "json_api") {
    const master = await runCatalogMasterJsonApiDryRun({
      jobId,
      segment: input.segment,
      catalogVariants: input.catalogVariants,
      skipMatching: !input.catalogVariants?.length,
    });
    const finishedMs = Date.now();
    const importStages = importStageTimings(master.pipeline);
    const report = buildExecutionReport({
      input,
      stages: [
        buildStageTiming(
          "json_api_adapter",
          jobStartedMs,
          finishedMs,
          master.success,
          master.success
            ? "json_api catalog master dry-run (no DB writes)"
            : master.pipeline.context.errors[0]?.message ?? "json_api dry-run failed",
        ),
        ...importStages,
      ],
      scrapeStats: null,
      pipeline: master.pipeline,
      scrapeErrors: [],
      performance: buildPerformanceReport({
        totalMs: finishedMs - jobStartedMs,
        workerMs: 0,
        scraperMs: 0,
        importMs: finishedMs - jobStartedMs,
        vehicleCount: master.summary.recordCount,
        cardCount: master.summary.recordCount,
      }),
    });

    return {
      jobId,
      success: master.success,
      input,
      payload: null,
      scrapeErrors: [],
      pipeline: master.pipeline,
      report,
    };
  }

  if (input.source !== "gaadi_bazaar") {
    const finishedMs = Date.now();
    const report = buildExecutionReport({
      input,
      stages: [
        buildStageTiming("playwright_worker", jobStartedMs, finishedMs, false, `Unsupported source: ${input.source}`),
      ],
      scrapeStats: null,
      pipeline: null,
      scrapeErrors: [],
      performance: buildPerformanceReport({
        totalMs: finishedMs - jobStartedMs,
        workerMs: 0,
        scraperMs: 0,
        importMs: 0,
        vehicleCount: 0,
        cardCount: 0,
      }),
    });

    return {
      jobId,
      success: false,
      input,
      payload: null,
      scrapeErrors: [],
      pipeline: null,
      report,
    };
  }

  const logger = options.logger ?? createWorkerLogger("CatalogImportJob");

  try {
    if (live) {
      const city = input.city ?? "Delhi";
      const listingUrl = buildGaadiBazaarLiveListingUrl({ city, search: input.search });
      const listingPath = new URL(listingUrl).pathname;
      const robots = await checkGaadiBazaarRobots({
        path: listingPath,
        userAgent: "MotorcartPlaywrightWorker/1.0 (Framework; +https://motorcart.in/bot)",
      });
      if (!robots.allowed) {
        const finishedMs = Date.now();
        const message = `robots.txt gate failed: ${robots.reason}`;
        const report = buildExecutionReport({
          input,
          stages: [buildStageTiming("playwright_worker", jobStartedMs, finishedMs, false, message)],
          scrapeStats: null,
          pipeline: null,
          scrapeErrors: [{ code: "ROBOTS_DISALLOWED", message, retryable: false }],
          performance: buildPerformanceReport({
            totalMs: finishedMs - jobStartedMs,
            workerMs: 0,
            scraperMs: 0,
            importMs: 0,
            vehicleCount: 0,
            cardCount: 0,
          }),
        });
        return {
          jobId,
          success: false,
          input,
          payload: null,
          scrapeErrors: [{ code: "ROBOTS_DISALLOWED", message, retryable: false }],
          pipeline: null,
          report,
        };
      }
      logger.info("robots.txt allow", { path: listingPath, robotsUrl: robots.robotsUrl });
    }

    if (useWorkerPath(input)) {
      const workerStartedMs = Date.now();
      const workerInit = await initializeWorker(input, options);
      worker = workerInit.worker;
      workerOwned = workerInit.owned;
      workerMs = Date.now() - workerStartedMs;
      stages.push(
        buildStageTiming(
          "playwright_worker",
          workerStartedMs,
          Date.now(),
          true,
          live ? "Real PlaywrightBrowserDriver initialized (host allow-list)" : "Worker initialized",
        ),
      );
    } else {
      stages.push(
        buildStageTiming(
          "playwright_worker",
          Date.now(),
          Date.now(),
          true,
          "Skipped — fixture navigation (usePlaywrightWorker: false)",
        ),
      );
    }

    const scraperStartedMs = Date.now();
    const session = useWorkerPath(input)
      ? createWorkerScraperSessionBundle(worker!, loadFixtureHtmlMap(), {
          live,
          city: input.city,
          search: input.search,
          urls: live ? createGaadiBazaarLiveUrlResolver() : undefined,
        })
      : createFixtureScraperSession();

    const scrapeResult = await scrapeGaadiBazaarPayload(
      {
        session,
        logger,
        config: {
          maxListingPages: input.pages ?? 1,
          ...(live || input.maxVehicles != null
            ? { maxVehicles: input.maxVehicles ?? 100 }
            : {}),
          urlMode: live ? "live" : "mock",
          ...(live
            ? {
                retry: {
                  maxAttempts: 2,
                  baseDelayMs: 1_000,
                  maxDelayMs: 5_000,
                  backoffMultiplier: 2,
                  retryableCodes: ["SCRAPE_NAV_FAILED", "SCRAPE_EXTRACT_FAILED", "TIMEOUT"],
                },
              }
            : {}),
        },
      },
      {
        city: input.city,
        query: input.search,
        segment: input.segment,
        maxListingPages: input.pages ?? 1,
        ...(live || input.maxVehicles != null
          ? { maxVehicles: input.maxVehicles ?? 100 }
          : {}),
      },
    );
    scraperMs = Date.now() - scraperStartedMs;

    const blocked = scrapeResult.errors.find((e) =>
      /SCRAPE_(CAPTCHA|CLOUDFLARE|LOGIN_REQUIRED|ACCESS_DENIED)|ROBOTS_DISALLOWED/.test(e.code),
    );
    if (blocked) {
      stages.push(
        buildStageTiming(
          "gaadi_bazaar_scraper",
          scraperStartedMs,
          Date.now(),
          false,
          `STOPPED: ${blocked.code} — ${blocked.message}`,
        ),
      );
      const totalMs = Date.now() - jobStartedMs;
      const report = buildExecutionReport({
        input,
        stages,
        scrapeStats: scrapeResult.stats,
        pipeline: null,
        scrapeErrors: scrapeResult.errors,
        performance: buildPerformanceReport({
          totalMs,
          workerMs,
          scraperMs,
          importMs: 0,
          vehicleCount: scrapeResult.payload.vehicles.length,
          cardCount: scrapeResult.stats.vehicleCardsSeen,
        }),
      });
      return {
        jobId,
        success: false,
        input,
        payload: scrapeResult.payload,
        scrapeErrors: scrapeResult.errors,
        pipeline: null,
        report,
      };
    }

    stages.push(
      buildStageTiming(
        "gaadi_bazaar_scraper",
        scraperStartedMs,
        Date.now(),
        scrapeResult.errors.length === 0 || scrapeResult.payload.vehicles.length > 0,
        `${scrapeResult.stats.vehiclesExtracted} vehicles from ${scrapeResult.stats.listingPagesVisited} page(s)`,
      ),
    );

    let pipeline = null;
    if (scrapeResult.payload.vehicles.length > 0) {
      const importStartedMs = Date.now();
      const processMedia = input.processMedia === true;
      pipeline = await runGaadiBazaarCatalogImport(scrapeResult.payload, {
        catalogVariants: input.catalogVariants,
        skipMatching: !input.catalogVariants?.length,
        // Phase 5F live default: skip media. Phase 5G sets processMedia=true.
        runMedia: processMedia ? true : live ? false : undefined,
        mediaDownloader: processMedia ? options.mediaDownloader : undefined,
        storageProvider: processMedia ? options.storageProvider : undefined,
      });
      importMs = Date.now() - importStartedMs;
      stages.push(...remapUploadAsAdapter(importStageTimings(pipeline)));
    }

    const totalMs = Date.now() - jobStartedMs;
    const report = buildExecutionReport({
      input,
      stages,
      scrapeStats: scrapeResult.stats,
      pipeline,
      scrapeErrors: scrapeResult.errors,
      performance: buildPerformanceReport({
        totalMs,
        workerMs,
        scraperMs,
        importMs,
        vehicleCount: scrapeResult.payload.vehicles.length,
        cardCount: scrapeResult.stats.vehicleCardsSeen,
      }),
    });

    const importSuccess = pipeline?.success ?? scrapeResult.payload.vehicles.length === 0;
    const scrapeSuccess = scrapeResult.errors.length === 0 || scrapeResult.payload.vehicles.length > 0;

    return {
      jobId,
      success: scrapeSuccess && importSuccess,
      input,
      payload: scrapeResult.payload,
      scrapeErrors: scrapeResult.errors,
      pipeline,
      report,
    };
  } finally {
    await shutdownWorker(worker, workerOwned, live);
  }
}
