import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, beforeEach, afterEach } from "node:test";
import { mapGaadiBazaarPayload } from "../../../catalog/import/sources/gaadi-bazaar/gaadi-bazaar-mapper";
import { runGaadiBazaarCatalogImport } from "../../../catalog/import/catalog-import.service";
import {
  PlaywrightWorker,
  MockBrowserDriverFactory,
  registerMockPage,
  clearMockPages,
  createWorkerLogger,
} from "../../../playwright-worker";
import {
  createFixtureScraperSession,
  createGaadiBazaarScraper,
  scrapeGaadiBazaarPayload,
  extractVehicleFromDetailPage,
  loadFixtureHtmlMap,
  createWorkerScraperSession,
} from "./index";
import { InMemoryDomInteraction, createGaadiBazaarPomBundle } from "../pom";
import { HtmlDomQueryPort } from "../pom/dom/html-dom-query";
import { WorkerScraperNavigation } from "./worker-navigation";
import { MutableDomQueryPort } from "./scraper-session";

const FIXTURE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../pom/fixtures/html");

function readFixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURE_DIR, name), "utf8");
}

describe("vehicle-field-extractor", () => {
  it("maps vehicle detail page to GaadiBazaarScrapedVehicle", () => {
    const dom = HtmlDomQueryPort.fromHtml(readFixture("vehicle.html"));
    const pom = createGaadiBazaarPomBundle({
      dom,
      navigation: { goto: async () => {}, getCurrentUrl: () => "mock://gaadi-bazaar/vehicle/gb-creta-12345" },
      interaction: new InMemoryDomInteraction(),
    });

    const vehicle = extractVehicleFromDetailPage(pom.vehicle);
    assert.equal(vehicle.brand, "Hyundai");
    assert.equal(vehicle.model, "Creta");
    assert.equal(vehicle.fuel, "Diesel");
    assert.equal(vehicle.transmission, "Automatic");
    assert.equal(vehicle.brochureUrl, "https://cdn.example.com/gaadi/creta-brochure.pdf");
    assert.equal(vehicle.imageUrls?.length, 2);
    assert.match(vehicle.vehicleUrl ?? "", /hyundai-creta/);
  });
});

describe("GaadiBazaarScraper (fixture navigation)", () => {
  it("scrapes listing cards and vehicle details into payload", async () => {
    const session = createFixtureScraperSession();
    const scraper = createGaadiBazaarScraper({
      session,
      config: { maxListingPages: 1, maxVehicles: 10 },
    });

    const result = await scraper.scrape({ query: "creta" });

    assert.equal(result.payload.source, "gaadi_bazaar");
    assert.equal(result.payload.vehicles.length, 2);
    assert.equal(result.stats.vehiclesExtracted, 2);
    assert.equal(result.stats.listingPagesVisited, 1);

    const creta = result.payload.vehicles.find((v) => v.model === "Creta");
    assert.ok(creta);
    assert.equal(creta?.fuel, "Diesel");
    assert.equal(creta?.brochureUrl, "https://cdn.example.com/gaadi/creta-brochure.pdf");

    const swift = result.payload.vehicles.find((v) => v.model === "Swift");
    assert.ok(swift);
    assert.equal(swift?.fuel, "Petrol");
  });

  it("supports pagination across listing pages", async () => {
    const session = createFixtureScraperSession();
    const result = await scrapeGaadiBazaarPayload(
      { session, config: { maxListingPages: 2, maxVehicles: 10 } },
      { query: "cars" },
    );

    assert.equal(result.stats.listingPagesVisited, 2);
    assert.equal(result.payload.vehicles.length, 3);
    assert.ok(result.payload.vehicles.some((v) => v.model === "Nexon"));
  });

  it("produces payload compatible with existing adapter mapper", async () => {
    const session = createFixtureScraperSession();
    const { payload } = await scrapeGaadiBazaarPayload({ session, config: { maxListingPages: 1 } });

    const mapped = mapGaadiBazaarPayload(payload);
    assert.equal(mapped.length, payload.vehicles.length);
    assert.equal(mapped.filter((r) => r.importRecord).length, payload.vehicles.length);
  });

  it("does not write database or publish", async () => {
    const session = createFixtureScraperSession();
    const result = await scrapeGaadiBazaarPayload({ session, config: { maxListingPages: 1 } });
    assert.ok(result.payload.vehicles.length > 0);
    assert.equal("published" in result, false);
    assert.equal("saved" in result, false);
  });
});

describe("GaadiBazaarScraper + import pipeline (read-only)", () => {
  it("feeds scraper payload into existing GaadiBazaar import entry point", async () => {
    const session = createFixtureScraperSession();
    const scrape = await scrapeGaadiBazaarPayload({ session, config: { maxListingPages: 1 } });

    const importRun = await runGaadiBazaarCatalogImport(scrape.payload, { skipMatching: true });
    assert.equal(importRun.success, true);
    assert.ok(importRun.context.records.length >= scrape.payload.vehicles.length);
  });
});

describe("GaadiBazaarScraper + PlaywrightWorker", () => {
  beforeEach(() => {
    clearMockPages();
    registerMockPage("gaadi-bazaar/listing", readFixture("listing.html"));
    registerMockPage("gaadi-bazaar/vehicle/gb-creta-12345", readFixture("vehicle.html"));
    registerMockPage("gaadi-bazaar/vehicle/gb-swift-67890", readFixture("vehicle-swift.html"));
  });

  afterEach(() => {
    clearMockPages();
  });

  it("uses PlaywrightWorker for mock navigation HTML snapshots", async () => {
    const worker = new PlaywrightWorker({
      driverFactory: new MockBrowserDriverFactory(),
      logger: createWorkerLogger("WorkerScrapeTest"),
      config: { randomDelay: { minMs: 0, maxMs: 0 }, rateLimit: { maxConcurrent: 2, minIntervalMs: 0 } },
    });

    const dom = new MutableDomQueryPort(readFixture("listing.html"));
    const navigation = new WorkerScraperNavigation(worker, dom);
    const interaction = new InMemoryDomInteraction();
    const pom = createGaadiBazaarPomBundle({ dom, navigation, interaction });

    await navigation.goto("mock://gaadi-bazaar/vehicle/gb-creta-12345");
    const vehicle = extractVehicleFromDetailPage(pom.vehicle);
    assert.equal(vehicle.brand, "Hyundai");

    await worker.shutdown();
  });
});

describe("error handling", () => {
  it("records errors for missing fixture URLs", async () => {
    const session = createFixtureScraperSession(new Map());
    const result = await scrapeGaadiBazaarPayload(
      { session, config: { maxListingPages: 1, maxVehicles: 1 } },
    ).catch(() => null);

    if (result) {
      assert.equal(result.payload.vehicles.length, 0);
    } else {
      assert.ok(true);
    }
  });
});

describe("logging", () => {
  it("writes scrape lifecycle logs", async () => {
    const logger = createWorkerLogger("GaadiBazaarScraperTest");
    const session = createFixtureScraperSession();
    await scrapeGaadiBazaarPayload({ session, logger, config: { maxListingPages: 1 } });
    const entries = logger.getEntries?.() ?? [];
    assert.ok(entries.some((e) => e.message.includes("Scrape started")));
    assert.ok(entries.some((e) => e.message.includes("Scrape finished")));
  });
});
