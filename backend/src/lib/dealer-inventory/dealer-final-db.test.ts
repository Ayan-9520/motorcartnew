/**
 * Dealer + New Vehicle final hardening — DB tests against local Docker PostgreSQL.
 */
import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { prisma } from "@/lib/prisma";
import { SalesOsError } from "@/lib/sales-os/errors";
import type { SalesActor } from "@/lib/sales-os/http";
import { getInventoryByPincode } from "@/services/inventory-by-pincode.service";
import {
  __clearPendingImportsForTests,
  archiveDealerInventoryItem,
  confirmDealerInventoryImport,
  createDealerInventoryItem,
  listDealerInventory,
  listPublicNewCarStock,
  previewDealerInventoryImport,
  updateDealerInventoryItem,
  updateDealerInventoryStock,
} from "@/services/dealer-inventory.service";
import { DealerInventoryError } from "./errors";

const PREFIX = `__dfinal_${Date.now()}_`;
const PIN = "110001";

const ids = {
  ownerA: "",
  ownerB: "",
  customer: "",
  dealerA: "",
  dealerB: "",
  orgA: "",
  orgB: "",
  branchA: "",
  branchB: "",
  invA: "",
  leadId: "",
  quotationId: "",
};

function actorA(): SalesActor {
  return { userId: ids.ownerA, role: "dealer" };
}
function actorB(): SalesActor {
  return { userId: ids.ownerB, role: "dealer" };
}

async function seed() {
  const ownerA = await prisma.user.create({
    data: { email: `${PREFIX}a@test.com`, fullName: "Dealer Final A", role: "dealer", passwordHash: "x" },
  });
  const ownerB = await prisma.user.create({
    data: { email: `${PREFIX}b@test.com`, fullName: "Dealer Final B", role: "dealer", passwordHash: "x" },
  });
  const customer = await prisma.user.create({
    data: { email: `${PREFIX}c@test.com`, fullName: "Customer Final", role: "customer", passwordHash: "x" },
  });
  ids.ownerA = ownerA.id;
  ids.ownerB = ownerB.id;
  ids.customer = customer.id;

  const dealerA = await prisma.dealer.create({
    data: {
      ownerId: ownerA.id,
      name: `${PREFIX} A Motors`,
      slug: `${PREFIX}a-motors`,
      city: "Delhi",
      state: "DL",
      pincode: PIN,
      email: "private-a@test.com",
      phone: "9000000001",
      gstNumber: "07AAAAA0000A1Z5",
      panNumber: "AAAAA0000A",
    },
  });
  const dealerB = await prisma.dealer.create({
    data: {
      ownerId: ownerB.id,
      name: `${PREFIX} B Motors`,
      slug: `${PREFIX}b-motors`,
      city: "Mumbai",
      state: "MH",
      pincode: "400001",
    },
  });
  ids.dealerA = dealerA.id;
  ids.dealerB = dealerB.id;

  const orgA = await prisma.organization.create({
    data: {
      type: "DEALER",
      name: `${PREFIX} Org A`,
      displayName: `${PREFIX} Org A`,
      slug: `${PREFIX}org-a`,
      createdByUserId: ownerA.id,
      legacyDealerId: dealerA.id,
    },
  });
  const orgB = await prisma.organization.create({
    data: {
      type: "DEALER",
      name: `${PREFIX} Org B`,
      displayName: `${PREFIX} Org B`,
      slug: `${PREFIX}org-b`,
      createdByUserId: ownerB.id,
      legacyDealerId: dealerB.id,
    },
  });
  ids.orgA = orgA.id;
  ids.orgB = orgB.id;

  await prisma.organizationMember.create({
    data: { organizationId: orgA.id, userId: ownerA.id, role: "OWNER", status: "active" },
  });
  await prisma.organizationMember.create({
    data: { organizationId: orgB.id, userId: ownerB.id, role: "OWNER", status: "active" },
  });

  const branchA = await prisma.organizationBranch.create({
    data: {
      organizationId: orgA.id,
      name: "HQ Delhi",
      city: "Delhi",
      state: "DL",
      postalCode: PIN,
      isActive: true,
    },
  });
  const branchB = await prisma.organizationBranch.create({
    data: {
      organizationId: orgB.id,
      name: "HQ Mumbai",
      city: "Mumbai",
      state: "MH",
      postalCode: "400001",
      isActive: true,
    },
  });
  ids.branchA = branchA.id;
  ids.branchB = branchB.id;
}

async function cleanup() {
  __clearPendingImportsForTests();
  if (ids.quotationId) {
    await prisma.quotation.deleteMany({ where: { id: ids.quotationId } }).catch(() => undefined);
  }
  await prisma.newCarInventory
    .deleteMany({ where: { dealerId: { in: [ids.dealerA, ids.dealerB].filter(Boolean) } } })
    .catch(() => undefined);
  if (ids.leadId) await prisma.lead.deleteMany({ where: { id: ids.leadId } }).catch(() => undefined);
  await prisma.activityLog
    .deleteMany({ where: { userId: { in: [ids.ownerA, ids.ownerB].filter(Boolean) } } })
    .catch(() => undefined);
  if (ids.branchA) {
    await prisma.organizationBranch.deleteMany({ where: { id: { in: [ids.branchA, ids.branchB] } } }).catch(() => undefined);
  }
  if (ids.orgA) {
    await prisma.organizationMember
      .deleteMany({ where: { organizationId: { in: [ids.orgA, ids.orgB] } } })
      .catch(() => undefined);
    await prisma.organization.deleteMany({ where: { id: { in: [ids.orgA, ids.orgB] } } }).catch(() => undefined);
  }
  if (ids.dealerA) {
    await prisma.dealer.deleteMany({ where: { id: { in: [ids.dealerA, ids.dealerB] } } }).catch(() => undefined);
  }
  await prisma.user
    .deleteMany({ where: { id: { in: [ids.ownerA, ids.ownerB, ids.customer].filter(Boolean) } } })
    .catch(() => undefined);
}

describe("dealer-final-db", () => {
  after(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it("seeds isolated dealer A/B fixtures", async () => {
    await seed();
    assert.ok(ids.dealerA);
    assert.ok(ids.dealerB);
    assert.notEqual(ids.dealerA, ids.dealerB);
  });

  it("rejects forged dealer_id on create", async () => {
    await assert.rejects(
      () =>
        createDealerInventoryItem(actorA(), {
          dealer_id: ids.dealerB,
          brand: "Maruti Suzuki",
          model: "Swift",
          variant: "VXi",
          stock: 1,
          ex_showroom_price: 650000,
        }),
      (e: unknown) => e instanceof SalesOsError && e.code === "FORGED_DEALER",
    );
  });

  it("creates single inventory under server-owned dealer A", async () => {
    const row = await createDealerInventoryItem(actorA(), {
      brand: "Maruti Suzuki",
      model: "Swift",
      variant: "VXi",
      year: 2025,
      fuel_type: "Petrol",
      transmission: "Manual",
      stock: 3,
      stock_status: "available",
      ex_showroom_price: 650000,
      dealer_price: 640000,
      colour: "White",
      branch_id: ids.branchA,
      pincode: PIN,
      internal_reference: `${PREFIX}SWIFT-W`,
    });
    assert.equal(row.dealer_id, ids.dealerA);
    ids.invA = String(row.id);
    const db = await prisma.newCarInventory.findUnique({ where: { id: ids.invA } });
    assert.ok(db);
    assert.equal(db!.dealerId, ids.dealerA);
    assert.equal(db!.stock, 3);
    assert.equal(Number(db!.price), 640000);
  });

  it("creates inventory with only brand/model/variant/stock (optionals blank)", async () => {
    const row = await createDealerInventoryItem(actorA(), {
      brand: "Kia",
      model: "Seltos",
      variant: "HTX",
      stock: 2,
      stock_status: "",
      pincode: "",
      branch: "",
      price: "",
      image_url: "",
    });
    assert.equal(row.dealer_id, ids.dealerA);
    assert.equal(Number(row.stock), 2);
    assert.equal(String(row.stock_status), "available");
    const meta = (await prisma.newCarInventory.findUnique({ where: { id: String(row.id) } }))?.metadata as Record<
      string,
      unknown
    >;
    assert.ok(meta?.catalog_status === "unmapped" || meta?.catalog_status === "catalog_empty" || meta?.catalog_status === "mapped");
  });

  it("rejects unauthorized branch on create", async () => {
    await assert.rejects(
      () =>
        createDealerInventoryItem(actorA(), {
          brand: "Hyundai",
          model: "Creta",
          variant: "SX",
          stock: 1,
          ex_showroom_price: 1200000,
          branch_id: ids.branchB,
        }),
      (e: unknown) => e instanceof DealerInventoryError && e.code === "UNAUTHORIZED_BRANCH",
    );
  });

  it("updates price and stock and persists after read-back", async () => {
    await updateDealerInventoryItem(actorA(), ids.invA, {
      dealer_price: 635000,
      discount: 15000,
      colour: "White",
    });
    await updateDealerInventoryStock(actorA(), ids.invA, 5);
    const listed = await listDealerInventory(actorA(), { dealerId: ids.dealerA });
    const hit = (listed.data as Array<Record<string, unknown>>).find((r) => r.id === ids.invA);
    assert.ok(hit);
    assert.equal(hit!.stock, 5);
    assert.equal(Number(hit!.price), 635000);
  });

  it("blocks cross-dealer update and list leakage", async () => {
    await assert.rejects(
      () => updateDealerInventoryStock(actorB(), ids.invA, 99),
      (e: unknown) => e instanceof SalesOsError && (e.code === "FORGED_DEALER" || e.code === "FORBIDDEN" || e.code === "CROSS_TENANT"),
    );
    const listedB = await listDealerInventory(actorB(), { dealerId: ids.dealerB });
    const leak = (listedB.data as Array<Record<string, unknown>>).some((r) => r.id === ids.invA);
    assert.equal(leak, false);
  });

  it("PIN discovery returns available stock>0 only", async () => {
    const before = await getInventoryByPincode(PIN);
    assert.ok(before.items.some((i) => i.inventoryId === ids.invA || i.dealerId === ids.dealerA));

    await updateDealerInventoryStock(actorA(), ids.invA, 0);
    const afterZero = await getInventoryByPincode(PIN);
    assert.equal(afterZero.items.some((i) => i.inventoryId === ids.invA), false);

    await updateDealerInventoryStock(actorA(), ids.invA, 2, "booked");
    const afterBooked = await getInventoryByPincode(PIN);
    assert.equal(afterBooked.items.some((i) => i.inventoryId === ids.invA), false);

    await updateDealerInventoryStock(actorA(), ids.invA, 4, "available");
  });

  it("public stock serializer omits GST/PAN/private email/phone", async () => {
    const publicRows = await listPublicNewCarStock({ pincode: PIN, limit: 20 });
    const hit = publicRows.find((r) => r.id === ids.invA);
    assert.ok(hit);
    assert.ok(hit!.dealer);
    const json = JSON.stringify(hit);
    assert.equal(json.includes("07AAAAA0000A1Z5"), false);
    assert.equal(json.includes("AAAAA0000A"), false);
    assert.equal(json.includes("private-a@test.com"), false);
    assert.equal(json.includes("9000000001"), false);
    assert.equal("notes" in hit!, false);
    assert.equal("gst_number" in (hit!.dealer as object), false);
  });

  it("CSV bulk preview validates and confirm imports only valid rows", async () => {
    const csv = [
      "brand,model,variant,model_year,fuel_type,transmission,colour,stock,stock_status,ex_showroom_price,dealer_price,branch,pincode,internal_reference,dealer_id",
      `Honda,City,VX,2025,Petrol,Manual,Silver,2,available,1200000,1180000,HQ Delhi,${PIN},${PREFIX}CITY-1,${ids.dealerB}`,
      `Honda,City,ZX,2025,Petrol,CVT,Black,1,available,1400000,1380000,HQ Delhi,${PIN},${PREFIX}CITY-2,`,
      `Honda,City,VX,2025,Petrol,Manual,Silver,2,available,1200000,1180000,HQ Delhi,${PIN},${PREFIX}CITY-1,`,
      `Kia,Seltos,HTX,2025,Petrol,Automatic,White,bad,available,1100000,1100000,HQ Delhi,${PIN},${PREFIX}BADSTOCK,`,
      `Kia,Sonet,HTK,2025,Petrol,Manual,Blue,1,available,900000,900000,HQ Delhi,11000,${PREFIX}BADPIN,`,
      `MG,Astor,Sharp,2025,Petrol,Automatic,Grey,1,available,1500000,1500000,HQ Mumbai,${PIN},${PREFIX}BADBR,`,
      `Toyota,Glanza,V,2025,Petrol,Manual,White,0,out_of_stock,800000,800000,HQ Delhi,${PIN},${PREFIX}ZERO,`,
      `Renault,Kiger,RXZ,2025,Petrol,Manual,Orange,2,out_of_stock,900000,900000,HQ Delhi,${PIN},${PREFIX}OOS,`,
      `Skoda,Kushaq,Style,2025,Petrol,Automatic,Blue,3,available,1600000,1580000,HQ Delhi,${PIN},${PREFIX}AVAIL,`,
    ].join("\n");

    const preview = await previewDealerInventoryImport(actorA(), {
      filename: "dealer-final.csv",
      content: csv,
      mode: "create_only",
      dealerId: ids.dealerA,
    });

    assert.ok(preview.batchId);
    assert.ok(preview.invalid >= 1);
    assert.ok(preview.valid >= 1);
    assert.ok(preview.needCorrection === preview.invalid);
    assert.ok(preview.valid === preview.readyToImport + preview.readyWithWarnings);
    assert.ok(preview.warnings.some((w) => /forbidden/i.test(w)));

    const errRows = preview.rows.filter((r) => r.action === "error");
    assert.ok(errRows.some((r) => r.errors.some((e) => /stock/i.test(e))));
    assert.ok(errRows.some((r) => r.errors.some((e) => /PIN|pin/i.test(e))));
    assert.ok(errRows.some((r) => r.errors.some((e) => /Branch/i.test(e))));

    const result = await confirmDealerInventoryImport(actorA(), preview.batchId);
    assert.ok(result.created >= 1);
    assert.equal(result.created + result.updated + result.skipped + result.failed, result.total);

    await assert.rejects(
      () => confirmDealerInventoryImport(actorA(), preview.batchId),
      (e: unknown) => e instanceof DealerInventoryError && e.code === "BATCH_NOT_FOUND",
    );

    const listed = await listDealerInventory(actorA(), { dealerId: ids.dealerA, pageSize: 100 });
    for (const r of listed.data as Array<Record<string, unknown>>) {
      assert.equal(r.dealer_id, ids.dealerA);
    }
  });

  it("minimal CSV (brand/model only) previews and imports; blank variant + missing stock OK", async () => {
    const csv = [
      "Brand,Model,Variant,Qty",
      "Mahindra,XUV700,AX5,4",
      "Mahindra,XUV700,,",
      "Mahindra,Thar,LX,1",
    ].join("\n");
    const preview = await previewDealerInventoryImport(actorA(), {
      filename: "minimal.csv",
      content: csv,
      mode: "create_only",
      dealerId: ids.dealerA,
    });
    assert.equal(preview.total, 3);
    assert.equal(preview.needCorrection, 0);
    assert.ok(preview.valid === 3);
    const blankVariant = preview.rows.find((r) => r.input?.model === "XUV700" && !r.input?.variant);
    assert.ok(blankVariant);
    assert.equal(blankVariant!.severity, "warning");
    assert.equal(blankVariant!.input?.stock, 1);
    const result = await confirmDealerInventoryImport(actorA(), preview.batchId);
    assert.equal(result.created, 3);
    assert.equal(result.failed, 0);
  });

  it("REAL dealer XLSX fixture: parse → preview → confirm → list + no fake ₹0 public price", async () => {
    const { readFileSync } = await import("node:fs");
    const { dirname, join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const here = dirname(fileURLToPath(import.meta.url));
    const buf = readFileSync(join(here, "fixtures/dealer-real-inventory.xlsx"));

    const preview = await previewDealerInventoryImport(actorA(), {
      filename: "dealer-real-inventory.xlsx",
      content: buf,
      mode: "create_only",
      dealerId: ids.dealerA,
    });

    // Sheet has ~17 complete Brand+Model rows; trailing Maruti placeholders lack Model → row ERROR.
    assert.ok(preview.total >= 17, `expected >=17 rows, got ${preview.total}`);
    const errRows = preview.rows.filter((r) => r.action === "error");
    for (const e of errRows) {
      assert.ok(e.errors.length, `row ${e.rowNumber} error without reason`);
    }
    assert.ok(preview.valid >= 17, `expected >=17 importable, got ${preview.valid}`);
    assert.ok(preview.needCorrection >= 1, "expected incomplete trailing rows to need correction");
    assert.ok(preview.readyWithWarnings >= 1);

    const rangeRow = preview.rows.find((r) => r.input?.priceSourceText?.includes("19.45"));
    assert.ok(rangeRow);
    assert.equal(rangeRow!.input?.exShowroomPrice, 0);
    assert.equal(rangeRow!.input?.priceOnRequest, true);
    assert.equal(rangeRow!.input?.stock, 1);

    const lakhRow = preview.rows.find((r) => r.input?.exShowroomPrice === 1_369_000);
    assert.ok(lakhRow, "expected deterministic Rs. 13.69 Lakh → 1369000");

    const result = await confirmDealerInventoryImport(actorA(), preview.batchId);
    assert.equal(result.created, preview.valid);
    assert.equal(result.failed, preview.needCorrection);
    assert.ok(result.created >= 17);

    const listed = await listDealerInventory(actorA(), { dealerId: ids.dealerA, pageSize: 100 });
    assert.ok(listed.total >= result.created);
    for (const r of listed.data as Array<Record<string, unknown>>) {
      assert.equal(r.dealer_id, ids.dealerA);
    }

    const publicRows = await listPublicNewCarStock({ limit: 60 });
    const mine = publicRows.filter((r) => (r.dealer as { id?: string } | null)?.id === ids.dealerA);
    assert.ok(mine.length >= 1);
    for (const r of mine) {
      if (r.price_on_request) {
        assert.equal(r.price, null);
        assert.equal(r.price_display, "Price on request");
      } else {
        assert.ok(typeof r.price === "number" && (r.price as number) > 0);
      }
      assert.notEqual(r.price, 0);
    }

    const pinHits = await getInventoryByPincode(PIN);
    assert.ok(Array.isArray(pinHits.items));
    assert.ok(pinHits.items.some((i) => String(i.brand).toLowerCase().includes("mahindra")));
  });

  it("create_update mode can update existing by internal reference", async () => {
    const csv = [
      "brand,model,variant,stock,stock_status,ex_showroom_price,dealer_price,colour,internal_reference,pincode",
      `Skoda,Kushaq,Style,9,available,1600000,1550000,Blue,${PREFIX}AVAIL,${PIN}`,
    ].join("\n");
    const preview = await previewDealerInventoryImport(actorA(), {
      filename: "upsert.csv",
      content: csv,
      mode: "create_update",
      dealerId: ids.dealerA,
    });
    const result = await confirmDealerInventoryImport(actorA(), preview.batchId);
    assert.ok(result.updated + result.created >= 1);
  });

  it("enquiry creates canonical Lead scoped to dealer A", async () => {
    const lead = await prisma.lead.create({
      data: {
        dealerId: ids.dealerA,
        customerUserId: ids.customer,
        name: "UAT Customer",
        phone: "9876543210",
        source: "new_car_enquiry",
        status: "new",
        notes: `Interested in inventory ${ids.invA}`,
      },
    });
    ids.leadId = lead.id;
    assert.equal((await prisma.lead.count({ where: { dealerId: ids.dealerA, id: lead.id } })), 1);
    assert.equal((await prisma.lead.count({ where: { dealerId: ids.dealerB, id: lead.id } })), 0);
  });

  it("soft-archives inventory linked to quotation", async () => {
    const q = await prisma.quotation.create({
      data: {
        quotationNumber: `${PREFIX}Q1`,
        customerUserId: ids.customer,
        createdByUserId: ids.ownerA,
        dealerId: ids.dealerA,
        inventoryId: ids.invA,
        exShowroomAmount: 650000,
        totalAmount: 650000,
        status: "draft",
      },
    });
    ids.quotationId = q.id;
    const archived = await archiveDealerInventoryItem(actorA(), ids.invA);
    assert.equal((archived as { deleted?: boolean }).deleted, undefined);
    const db = await prisma.newCarInventory.findUnique({ where: { id: ids.invA } });
    assert.ok(db);
    assert.equal(db!.stock, 0);
    assert.equal(db!.stockStatus, "out_of_stock");
  });
});
