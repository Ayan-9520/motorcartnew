/**
 * Phase 5G — Controlled Real GaadiBazaar Import + Media + Catalog Matching.
 *
 * Limits: City=Delhi, Search=Maruti Suzuki, pages=1, maxVehicles=100
 * Matching ON (DB variants). Media ON (fetch). Storage = configured R2/S3 only.
 * NEVER auto-publishes — attaches job for existing Phase 5C/5D admin approval.
 *
 * Run:
 *   $env:DATABASE_URL='postgresql://motorcart:strongpassword@localhost:5432/motorcart?schema=public'
 *   $env:NODE_OPTIONS='--max-http-header-size=131072'
 *   npm run catalog:gaadi-bazaar:controlled-import
 */
import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { loadCatalogVariantRecords } from "../src/lib/catalog/catalog-linking.loader";
import { runCatalogImportJob } from "../src/lib/catalog/import/catalog-import-job.service";
import {
  buildControlledImportQualityReport,
  controlledImportReportToCsv,
  controlledImportReportToHtml,
  controlledImportReportToJson,
  formatControlledImportSummaryText,
} from "../src/lib/catalog/import/catalog-import-controlled-report";
import { createFetchMediaDownloader } from "../src/lib/catalog/import/media/media-downloader";
import { resolveCatalogPublishStorage } from "../src/lib/catalog/import/publish/catalog-publish-storage";
import { createStorageGateBlockedProvider } from "../src/lib/catalog/import/publish/storage-gate-blocked.provider";
import { catalogImportAdminService } from "../src/services/catalog-import-admin.service";

async function main() {
  const started = performance.now();
  console.log("Starting Phase 5G controlled GaadiBazaar import…");
  console.log("Constraints: Delhi / Maruti Suzuki / 1 page / max 100 / matching ON / media ON / no auto-publish");

  const storageGate = resolveCatalogPublishStorage();
  let storageConfigured = storageGate.ok;
  let storageError: string | null = null;
  let storageProvider = storageGate.ok ? storageGate.provider : null;

  if (!storageGate.ok) {
    storageError = `${storageGate.code}: ${storageGate.message}`;
    console.error("STORAGE GATE:", storageError);
    console.error("Continuing scrape + matching + media validation; storage uploads blocked (no local fallback).");
    console.error("Publishing will remain blocked until STORAGE_PROVIDER/BUCKET/credentials are configured.");
    storageProvider = createStorageGateBlockedProvider({
      code: storageGate.code,
      message: storageGate.message,
    });
  } else if (storageGate.config.provider === "local") {
    storageConfigured = false;
    storageError = "STORAGE_LOCAL_FORBIDDEN: Local disk storage is not allowed for production media.";
    storageProvider = createStorageGateBlockedProvider({
      code: "STORAGE_LOCAL_FORBIDDEN",
      message: storageError,
    });
  } else {
    console.log(`Storage provider: ${storageGate.config.provider} / bucket=${storageGate.config.bucket}`);
  }

  const prisma = new PrismaClient();
  let catalogVariants;
  try {
    catalogVariants = await loadCatalogVariantRecords(prisma);
    console.log(`Loaded ${catalogVariants.length} catalog variant(s) from database`);
    if (catalogVariants.length === 0) {
      console.warn("WARNING: No catalog variants in DB — all records will be NO_MATCH (variants will not be auto-created).");
    }
  } finally {
    await prisma.$disconnect();
  }

  const result = await runCatalogImportJob(
    {
      source: "gaadi_bazaar",
      city: "Delhi",
      search: "Maruti Suzuki",
      pages: 1,
      maxVehicles: 100,
      usePlaywrightWorker: true,
      useRealBrowser: true,
      processMedia: true,
      catalogVariants,
      jobId: `gb-controlled-import-${Date.now()}`,
    },
    {
      mediaDownloader: createFetchMediaDownloader({
        headers: {
          "User-Agent": "MotorcartPlaywrightWorker/1.0 (Framework; +https://motorcart.in/bot)",
          Referer: "https://www.gaadibazaar.in/",
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
      }),
      storageProvider: storageProvider ?? undefined,
    },
  );

  // Attach to existing admin preview/approval store (in-memory, this process).
  const attached = catalogImportAdminService.attachCompletedJob(result);
  const preview = catalogImportAdminService.getPreview(attached.jobId, "admin");

  const elapsedMs = performance.now() - started;
  const quality = buildControlledImportQualityReport({
    result,
    catalogVariants,
    storageConfigured,
    storageError,
    runtimeMs: Math.round(elapsedMs),
  });

  const stamp = quality.summary.generatedAt.replace(/[:.]/g, "-");
  const outDir = path.join(process.cwd(), "reports/catalog-import-controlled");
  await fs.mkdir(outDir, { recursive: true });
  const base = `gaadi-bazaar-controlled-import-${stamp}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const csvPath = path.join(outDir, `${base}.csv`);
  const htmlPath = path.join(outDir, `${base}.html`);

  await Promise.all([
    fs.writeFile(jsonPath, controlledImportReportToJson(quality), "utf8"),
    fs.writeFile(csvPath, controlledImportReportToCsv(quality), "utf8"),
    fs.writeFile(htmlPath, controlledImportReportToHtml(quality), "utf8"),
  ]);

  console.log(formatControlledImportSummaryText(quality));
  console.log("");
  console.log(`Job success        : ${result.success}`);
  console.log(`Admin job id       : ${attached.jobId}`);
  console.log(`Preview records    : ${preview?.summary.totalRecords ?? 0}`);
  console.log(`Pending review     : ${preview?.summary.pendingReview ?? preview?.summary.needReview ?? 0}`);
  console.log(`JSON report        : ${jsonPath}`);
  console.log(`CSV report         : ${csvPath}`);
  console.log(`HTML report        : ${htmlPath}`);
  console.log("");
  console.log("STOP — no auto-publish, no bulk scrape. Admin must explicitly approve via Phase 5C/5D flow.");

  if (!storageConfigured) {
    console.error("");
    console.error("STOPPED before publish due to storage configuration error.");
    console.error(`Required: STORAGE_PROVIDER=cloudflare_r2 (or aws_s3), STORAGE_BUCKET, STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY`);
    console.error(`Detail: ${storageError}`);
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
