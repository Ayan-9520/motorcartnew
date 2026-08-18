/**
 * Catalog master JSON API dry-run (local mock or licensed provider).
 *
 * Requires:
 *   CATALOG_MASTER_SOURCE=json_api
 *   CATALOG_MASTER_SOURCE_URL=<URL>
 *   CATALOG_MASTER_API_KEY=<optional>
 *
 * Local Docker mock:
 *   CATALOG_MASTER_SOURCE_URL=http://catalog-master-mock:3099/v1/vehicles
 *
 * Optional scenario override:
 *   CATALOG_MASTER_DRY_RUN_PATH=/v1/vehicles/duplicates|invalid|listing-shaped
 *
 * DRY-RUN ONLY — no catalog DB writes, no publish.
 *
 * Run: npm run catalog:master:json-api:dry-run
 */
import fs from "node:fs/promises";
import path from "node:path";
import { runCatalogMasterJsonApiDryRun } from "../src/lib/catalog/import/catalog-master-json-api.service";
import { resolveCatalogMasterJsonApiConfig } from "../src/lib/catalog/import/sources/json-api/json-api-config";

function resolveDryRunUrl(baseUrl: string): string {
  const scenarioPath = (process.env.CATALOG_MASTER_DRY_RUN_PATH || "").trim();
  if (!scenarioPath) return baseUrl;
  try {
    const url = new URL(baseUrl);
    const origin = `${url.protocol}//${url.host}`;
    const normalized = scenarioPath.startsWith("/") ? scenarioPath : `/${scenarioPath}`;
    return `${origin}${normalized}`;
  } catch {
    return baseUrl;
  }
}

async function main() {
  const config = resolveCatalogMasterJsonApiConfig();
  const sourceUrl = config.sourceUrl ? resolveDryRunUrl(config.sourceUrl) : null;

  console.log("Catalog master JSON API dry-run");
  console.log(`CATALOG_MASTER_SOURCE     : ${config.source || "(unset)"}`);
  console.log(`CATALOG_MASTER_SOURCE_URL : ${sourceUrl ? sourceUrl : "(missing)"}`);
  console.log(`CATALOG_MASTER_API_KEY    : ${config.apiKey ? "(configured)" : "(missing)"}`);
  console.log("Constraints: dry-run only · no DB writes · no publish · not GaadiBazaar listings");

  if (!sourceUrl) {
    console.error("");
    console.error("STOPPED — CATALOG_MASTER_SOURCE_URL_NOT_CONFIGURED");
    console.error("For local Docker mock set:");
    console.error("  CATALOG_MASTER_SOURCE_URL=http://catalog-master-mock:3099/v1/vehicles");
    console.error("  CATALOG_MASTER_API_KEY=local-dev-mock-key");
    process.exitCode = 2;
    return;
  }

  const result = await runCatalogMasterJsonApiDryRun({
    jobId: `catalog-master-json-api-dry-run-${Date.now()}`,
    sourceUrl,
    apiKey: config.apiKey,
    skipMatching: true,
  });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.join(process.cwd(), "reports/catalog-master-json-api");
  await fs.mkdir(outDir, { recursive: true });
  const jsonPath = path.join(outDir, `catalog-master-json-api-dry-run-${stamp}.json`);

  const report = {
    generatedAt: new Date().toISOString(),
    dryRun: true as const,
    databaseWrites: 0 as const,
    published: false as const,
    sourceUrl,
    success: result.success,
    jobId: result.jobId,
    summary: result.summary,
    completedStages: result.pipeline.completedStages,
    failedStage: result.pipeline.failedStage ?? null,
    errors: result.pipeline.context.errors.map((e) => ({
      code: e.code,
      message: e.message,
      stage: e.stage,
    })),
    warnings: [...result.pipeline.context.warnings],
    publish: result.pipeline.context.publish ?? null,
  };

  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");

  console.log("");
  console.log(`Success          : ${result.success}`);
  console.log(`Records          : ${result.summary.recordCount}`);
  console.log(`Normalized       : ${result.summary.normalizedCount}`);
  console.log(`Validation OK    : ${result.summary.validationAccepted}`);
  console.log(`Validation fail  : ${result.summary.validationRejected}`);
  console.log(`Duplicates       : ${result.summary.duplicateCount}`);
  console.log(`DB writes        : ${result.databaseWrites}`);
  console.log(`Published        : ${result.published}`);
  console.log(`Report           : ${jsonPath}`);

  if (!result.success) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
