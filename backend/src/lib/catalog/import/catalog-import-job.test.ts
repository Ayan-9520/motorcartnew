import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runCatalogImportJob } from "./catalog-import-job.service";

describe("runCatalogImportJob (no live scraper)", () => {
  it("rejects gaadi_bazaar live scrape with SCRAPER_REMOVED", async () => {
    const result = await runCatalogImportJob({ source: "gaadi_bazaar", city: "Delhi" });
    assert.equal(result.success, false);
    assert.equal(result.scrapeErrors[0]?.code, "SCRAPER_REMOVED");
  });
});
