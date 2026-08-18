/**
 * Catalog linking dry run — analyzes vehicles + new_car_inventory (read-only).
 * Run: npm run catalog:linking:dry-run
 *
 * Writes CSV + JSON reports under backend/reports/catalog-linking/
 * Does NOT update catalog_variant_id or any database rows.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { runCatalogLinkingDryRun } from "../src/lib/catalog/catalog-linking.loader";
import {
  catalogLinkReportToCsv,
  catalogLinkReportToJson,
  formatSummaryText,
} from "../src/lib/catalog/linking-report";

const prisma = new PrismaClient();

async function main() {
  const started = performance.now();
  const report = await runCatalogLinkingDryRun(prisma);
  const elapsedMs = performance.now() - started;

  const stamp = report.generatedAt.replace(/[:.]/g, "-");
  const outDir = path.join(process.cwd(), "reports/catalog-linking");
  await fs.mkdir(outDir, { recursive: true });

  const jsonPath = path.join(outDir, `catalog-linking-${stamp}.json`);
  const csvPath = path.join(outDir, `catalog-linking-${stamp}.csv`);

  await Promise.all([
    fs.writeFile(jsonPath, catalogLinkReportToJson(report), "utf8"),
    fs.writeFile(csvPath, catalogLinkReportToCsv(report), "utf8"),
  ]);

  console.log(formatSummaryText(report));
  console.log("");
  console.log(`Analysis time : ${elapsedMs.toFixed(1)} ms`);
  console.log(`JSON report   : ${jsonPath}`);
  console.log(`CSV report    : ${csvPath}`);
  console.log("");
  console.log("Dry run complete — no database rows were modified.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
