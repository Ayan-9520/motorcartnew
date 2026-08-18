import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { clearMockPages } from "../../playwright-worker";
import { runCatalogImportJob } from "./catalog-import-job.service";
import { stageLabel } from "./catalog-import-job-report";

describe("runCatalogImportJob (fixture navigation)", () => {
  it("runs scraper and import pipeline end-to-end with dry-run report", async () => {
    const result = await runCatalogImportJob(
      {
        source: "gaadi_bazaar",
        city: "Mumbai",
        search: "creta",
        pages: 1,
        usePlaywrightWorker: false,
      },
      {},
    );

    assert.equal(result.input.source, "gaadi_bazaar");
    assert.ok(result.payload);
    assert.ok(result.payload!.vehicles.length >= 2);
    assert.ok(result.pipeline);
    assert.equal(result.pipeline!.success, true);
    assert.equal(result.report.dryRun, true);
    assert.equal(result.report.importSummary.published, false);
    assert.ok(result.report.stages.some((s) => s.stage === "gaadi_bazaar_scraper"));
    assert.ok(result.report.stages.some((s) => s.stage === "normalize"));
    assert.ok(result.report.stages.some((s) => s.stage === "preview"));
    assert.ok(result.report.performance.totalDurationMs >= 0);
    assert.equal(result.report.errorSummary.scrapeErrors, result.scrapeErrors.length);
  });

  it("includes stage timings for all pipeline stages", async () => {
    const result = await runCatalogImportJob({
      source: "gaadi_bazaar",
      pages: 1,
      usePlaywrightWorker: false,
    });

    const stageNames = result.report.stages.map((s) => s.stage);
    assert.ok(stageNames.includes("validate"));
    assert.ok(stageNames.includes("duplicate_check"));
    assert.ok(stageNames.includes("media"));
    assert.ok(stageNames.includes("storage"));
    assert.ok(stageNames.includes("preview"));

    for (const timing of result.report.stages) {
      assert.ok(timing.durationMs >= 0);
      assert.ok(timing.label.length > 0);
    }
  });

  it("paginates listing pages when pages > 1", async () => {
    const result = await runCatalogImportJob({
      source: "gaadi_bazaar",
      pages: 2,
      usePlaywrightWorker: false,
    });

    assert.ok(result.payload!.vehicles.length >= 3);
    assert.equal(result.report.scrapeStats?.listingPagesVisited, 2);
  });
});

describe("runCatalogImportJob (Playwright Worker mock path)", () => {
  beforeEach(() => {
    clearMockPages();
  });

  afterEach(() => {
    clearMockPages();
  });

  it("initializes worker and scrapes via mock HTML snapshots", async () => {
    const result = await runCatalogImportJob({
      source: "gaadi_bazaar",
      search: "creta",
      pages: 1,
      usePlaywrightWorker: true,
    });

    assert.equal(result.success, true);
    assert.ok(result.report.stages.some((s) => s.stage === "playwright_worker" && s.success));
    assert.ok(result.report.performance.playwrightWorkerMs >= 0);
    assert.ok(result.payload!.vehicles.some((v) => v.model === "Creta"));
  });
});

describe("runCatalogImportJob error summary", () => {
  it("rejects unsupported sources without side effects", async () => {
    const result = await runCatalogImportJob({
      source: "gaadi_bazaar" as "gaadi_bazaar",
      usePlaywrightWorker: false,
    });

    assert.ok(result.success);

    const bad = await runCatalogImportJob({
      source: "unknown" as "gaadi_bazaar",
      usePlaywrightWorker: false,
    });

    assert.equal(bad.success, false);
    assert.equal(bad.payload, null);
    assert.equal(bad.pipeline, null);
  });
});

describe("stageLabel", () => {
  it("maps pipeline stages to human-readable labels", () => {
    assert.match(stageLabel("duplicate_check"), /Duplicate/i);
    assert.match(stageLabel("gaadi_bazaar_scraper"), /Scraper/i);
  });
});
