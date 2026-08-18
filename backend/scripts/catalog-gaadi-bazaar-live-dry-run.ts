/**
 * Phase 5F — Controlled Real GaadiBazaar scraping dry-run.
 *
 * Limits: City=Delhi, Search=Maruti Suzuki, pages=1, maxVehicles=100
 * DRY-RUN ONLY — no catalog writes, no publish, no production media upload.
 *
 * Run: npm run catalog:gaadi-bazaar:live-dry-run
 *
 * Tip: set NODE_OPTIONS=--max-http-header-size=131072 for robots.txt probe
 * (GaadiBazaar returns large Set-Cookie headers).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { runCatalogImportJob } from "../src/lib/catalog/import/catalog-import-job.service";
import {
  buildCatalogImportLiveQualityReport,
  catalogImportLiveReportToCsv,
  catalogImportLiveReportToHtml,
  catalogImportLiveReportToJson,
  formatLiveQualitySummaryText,
} from "../src/lib/catalog/import/catalog-import-live-report";

async function main() {
  const started = performance.now();
  console.log("Starting controlled GaadiBazaar live dry-run…");
  console.log("Constraints: Delhi / Maruti Suzuki / 1 page / max 100 / no publish");

  const result = await runCatalogImportJob({
    source: "gaadi_bazaar",
    city: "Delhi",
    search: "Maruti Suzuki",
    pages: 1,
    maxVehicles: 100,
    usePlaywrightWorker: true,
    useRealBrowser: true,
    jobId: `gb-live-dry-run-${Date.now()}`,
  });

  const quality = buildCatalogImportLiveQualityReport(result);
  const elapsedMs = performance.now() - started;
  quality.summary.runtimeMs = Math.round(elapsedMs);

  const stamp = quality.summary.generatedAt.replace(/[:.]/g, "-");
  const outDir = path.join(process.cwd(), "reports/catalog-import-live");
  await fs.mkdir(outDir, { recursive: true });

  const base = `gaadi-bazaar-live-dry-run-${stamp}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const csvPath = path.join(outDir, `${base}.csv`);
  const htmlPath = path.join(outDir, `${base}.html`);

  await Promise.all([
    fs.writeFile(jsonPath, catalogImportLiveReportToJson(quality), "utf8"),
    fs.writeFile(csvPath, catalogImportLiveReportToCsv(quality), "utf8"),
    fs.writeFile(htmlPath, catalogImportLiveReportToHtml(quality), "utf8"),
  ]);

  console.log(formatLiveQualitySummaryText(quality));
  console.log("");
  console.log(`Job success   : ${result.success}`);
  console.log(`JSON report   : ${jsonPath}`);
  console.log(`CSV report    : ${csvPath}`);
  console.log(`HTML report   : ${htmlPath}`);

  const blocked = result.scrapeErrors.find((e) =>
    /SCRAPE_(CAPTCHA|CLOUDFLARE|LOGIN_REQUIRED|ACCESS_DENIED)|ROBOTS_DISALLOWED|URL_NOT_ALLOWED/.test(
      e.code,
    ),
  );
  if (blocked) {
    console.error("");
    console.error("STOPPED — protection / permission failure (no bypass attempted).");
    console.error(`Code   : ${blocked.code}`);
    console.error(`Detail : ${blocked.message}`);
    console.error(
      "Required: outbound HTTPS to www.gaadibazaar.in, Playwright Chromium installed, and no CAPTCHA/login wall.",
    );
    process.exitCode = 2;
    return;
  }

  console.log("");
  console.log("Dry run complete — no catalog rows written, no publish, no production media upload.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
