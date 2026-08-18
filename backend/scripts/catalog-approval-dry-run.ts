/**
 * Catalog approval dry run — Phase 2C linking + Phase 2D review (read-only).
 * Run: npm run catalog:approval:dry-run
 */
import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { runCatalogApprovalDryRun } from "../src/lib/catalog/catalog-linking.loader";
import {
  catalogApprovalReportToCsv,
  catalogApprovalReportToHtml,
  catalogApprovalReportToJson,
  formatApprovalSummaryText,
} from "../src/lib/catalog/approval-report";

const prisma = new PrismaClient();

async function main() {
  const started = performance.now();
  const report = await runCatalogApprovalDryRun(prisma);
  const elapsedMs = performance.now() - started;

  const stamp = report.generatedAt.replace(/[:.]/g, "-");
  const outDir = path.join(process.cwd(), "reports/catalog-approval");
  await fs.mkdir(outDir, { recursive: true });

  const base = `catalog-approval-${stamp}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const csvPath = path.join(outDir, `${base}.csv`);
  const htmlPath = path.join(outDir, `${base}.html`);

  await Promise.all([
    fs.writeFile(jsonPath, catalogApprovalReportToJson(report), "utf8"),
    fs.writeFile(csvPath, catalogApprovalReportToCsv(report), "utf8"),
    fs.writeFile(htmlPath, catalogApprovalReportToHtml(report), "utf8"),
  ]);

  console.log(formatApprovalSummaryText(report));
  console.log("");
  console.log(`Analysis time : ${elapsedMs.toFixed(1)} ms`);
  console.log(`JSON report   : ${jsonPath}`);
  console.log(`CSV report    : ${csvPath}`);
  console.log(`HTML report   : ${htmlPath}`);
  console.log("");
  console.log("Dry run complete — no database rows were modified.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
