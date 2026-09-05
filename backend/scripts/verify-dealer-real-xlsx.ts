/**
 * One-shot real dealer XLSX verification (local Docker Postgres).
 * Does not commit; cleans up its own fixtures.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "@/lib/prisma";
import { parseInventorySpreadsheet } from "@/lib/dealer-inventory/parse-spreadsheet";
import {
  __clearPendingImportsForTests,
  confirmDealerInventoryImport,
  listDealerInventory,
  listPublicNewCarStock,
  previewDealerInventoryImport,
} from "@/services/dealer-inventory.service";

const here = dirname(fileURLToPath(import.meta.url));
const PREFIX = `__xlsx_verify_${Date.now()}_`;
const PIN = "110001";

async function main() {
  const owner = await prisma.user.create({
    data: { email: `${PREFIX}@t.com`, fullName: "XLSX Verify", role: "dealer", passwordHash: "x" },
  });
  const dealer = await prisma.dealer.create({
    data: {
      ownerId: owner.id,
      name: `${PREFIX}Motors`,
      slug: `${PREFIX}m`,
      city: "Delhi",
      state: "DL",
      pincode: PIN,
    },
  });
  await prisma.organization.create({
    data: {
      type: "DEALER",
      name: `${PREFIX}O`,
      displayName: `${PREFIX}O`,
      slug: `${PREFIX}o`,
      createdByUserId: owner.id,
      legacyDealerId: dealer.id,
      members: { create: { userId: owner.id, role: "OWNER", status: "active" } },
    },
  });
  const actor = { userId: owner.id, role: "dealer" as const };
  const buf = readFileSync(join(here, "../src/lib/dealer-inventory/fixtures/dealer-real-inventory.xlsx"));
  const parsed = parseInventorySpreadsheet({ filename: "dealer-real-inventory.xlsx", content: buf });
  const preview = await previewDealerInventoryImport(actor, {
    filename: "dealer-real-inventory.xlsx",
    content: buf,
    mode: "create_only",
    dealerId: dealer.id,
  });
  const byRow = new Map(parsed.rows.map((r) => [r.rowNumber, r.values]));
  const rejectedRows = preview.rows
    .filter((r) => r.action === "error")
    .map((r) => ({
      row: r.rowNumber,
      brand: byRow.get(r.rowNumber)?.brand ?? "",
      model: byRow.get(r.rowNumber)?.model ?? "",
      reason: r.errors.join("; "),
    }));
  const result = await confirmDealerInventoryImport(actor, preview.batchId);
  const listed = await listDealerInventory(actor, { dealerId: dealer.id, pageSize: 100 });
  const pub = await listPublicNewCarStock({ limit: 60 });
  const mine = pub.filter((r) => (r.dealer as { id?: string } | null)?.id === dealer.id);

  const report = {
    file: "backend/src/lib/dealer-inventory/fixtures/dealer-real-inventory.xlsx",
    source: "C:/Users/rupee/Downloads/motorcart-inventory-template (1).xlsx",
    headers: parsed.headers,
    mapped: parsed.mapped,
    excelDataRowsDetected: parsed.rows.length,
    previewTotal: preview.total,
    readyToImport: preview.readyToImport,
    readyWithWarnings: preview.readyWithWarnings,
    needCorrection: preview.needCorrection,
    valid: preview.valid,
    created: result.created,
    updated: result.updated,
    skipped: result.skipped,
    failed: result.failed,
    blankVariantCount: preview.rows.filter((r) => r.input && !r.input.variant && r.action !== "error").length,
    stockDefault1: preview.rows.filter((r) => r.input?.stock === 1 && r.action !== "error").length,
    priceOnRequest: preview.rows.filter((r) => r.input?.priceOnRequest).length,
    deterministicPrice: preview.rows.filter((r) => r.input && r.input.exShowroomPrice > 0).length,
    catalogUnmappedWarnings: preview.rows.filter((r) => r.warnings?.some((w) => /catalog/i.test(w))).length,
    dealerOwnedAll: (listed.data as Array<Record<string, unknown>>).every((r) => r.dealer_id === dealer.id),
    listedTotal: listed.total,
    publicMine: mine.length,
    publicFakeZero: mine.filter((r) => r.price === 0).length,
    publicOnRequest: mine.filter((r) => r.price_on_request).length,
    rejectedRows,
  };
  writeFileSync(join(here, "../.tmp-real-report.json"), JSON.stringify(report, null, 2));

  await prisma.newCarInventory.deleteMany({ where: { dealerId: dealer.id } });
  await prisma.organizationMember.deleteMany({ where: { userId: owner.id } });
  await prisma.organization.deleteMany({ where: { slug: `${PREFIX}o` } });
  await prisma.dealer.delete({ where: { id: dealer.id } });
  await prisma.user.delete({ where: { id: owner.id } });
  __clearPendingImportsForTests();
  await prisma.$disconnect();
  console.log(JSON.stringify(report, null, 2));
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
