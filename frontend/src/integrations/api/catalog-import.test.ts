import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CATALOG_IMPORT_ACTIVE_SOURCES,
  formatCatalogImportDuration,
  isCatalogImportJobActive,
  statusTotalDurationMs,
  type CatalogImportJobStatusResponse,
} from "./catalog-import.helpers.ts";

describe("catalog-import helpers", () => {
  it("identifies active job statuses", () => {
    assert.equal(isCatalogImportJobActive("started"), true);
    assert.equal(isCatalogImportJobActive("running"), true);
    assert.equal(isCatalogImportJobActive("completed"), false);
    assert.equal(isCatalogImportJobActive(undefined), false);
  });

  it("formats durations for display", () => {
    assert.equal(formatCatalogImportDuration(450), "450 ms");
    assert.equal(formatCatalogImportDuration(2500), "2.5 s");
    assert.equal(formatCatalogImportDuration(125_000), "2m 5s");
  });

  it("computes elapsed time from status timestamps", () => {
    const status: CatalogImportJobStatusResponse = {
      jobId: "catalog-import-test",
      status: "completed",
      currentStage: "preview",
      progress: {
        recordsProcessed: 2,
        stagesCompleted: 2,
        stagesTotal: 2,
        percentComplete: 100,
      },
      timings: [],
      errors: [],
      startedAt: "2026-08-05T09:00:00.000Z",
      finishedAt: "2026-08-05T09:00:02.500Z",
      dryRun: true,
    };

    assert.equal(statusTotalDurationMs(status), 2500);
  });

  it("marks only gaadi_bazaar as API-active", () => {
    assert.equal(CATALOG_IMPORT_ACTIVE_SOURCES.has("gaadi_bazaar"), true);
    assert.equal(CATALOG_IMPORT_ACTIVE_SOURCES.has("csv"), false);
    assert.equal(CATALOG_IMPORT_ACTIVE_SOURCES.has("excel"), false);
  });
});
