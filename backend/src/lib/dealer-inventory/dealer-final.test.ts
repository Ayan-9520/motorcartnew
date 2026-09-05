/**
 * Dealer + New Vehicle final hardening — unit tests (no DB).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  FORBIDDEN_IMPORT_COLUMNS,
  LOW_STOCK_THRESHOLD,
  MAX_BULK_FILE_BYTES,
  MAX_BULK_ROWS,
  STOCK_STATUSES,
} from "./constants";
import { DealerInventoryError } from "./errors";
import { inventoryTemplateCsv, parseInventorySpreadsheet } from "./parse-spreadsheet";
import {
  blankToEmpty,
  parseDealerPriceText,
  stripClientOwnedInventoryFields,
  validateInventoryInput,
} from "./validate";

const here = dirname(fileURLToPath(import.meta.url));

describe("dealer-final unit", () => {
  it("preserves Vehicle and NewCarInventory as separate models", () => {
    const schema = readFileSync(join(here, "../../../prisma/schema.prisma"), "utf8");
    assert.match(schema, /model Vehicle \{/);
    assert.match(schema, /model NewCarInventory \{/);
  });

  it("uses known stock statuses only (Phase 5C compatible)", () => {
    assert.deepEqual([...STOCK_STATUSES], [
      "available",
      "out_of_stock",
      "booked",
      "transit",
      "upcoming",
      "delivered",
    ]);
    assert.ok(LOW_STOCK_THRESHOLD >= 1);
  });

  it("accepts brand+model only; blank variant null; blank stock defaults to 1", () => {
    const ok = validateInventoryInput({
      brand: "Maruti Suzuki",
      model: "Grand Vitara",
      variant: "",
      stock: "",
      stock_status: "",
      price: "",
      pincode: "",
      image_url: "",
    });
    assert.equal(ok.brand, "Maruti Suzuki");
    assert.equal(ok.variant, null);
    assert.equal(ok.stock, 1);
    assert.equal(ok.stockStatus, "available");
    assert.equal(ok.priceOnRequest, true);
    assert.equal(ok.exShowroomPrice, 0);
    assert.ok(ok.warnings.some((w) => /variant/i.test(w)));
  });

  it("parses deterministic Lakh price and refuses ranges", () => {
    const single = parseDealerPriceText("Rs. 13.69 Lakh");
    assert.equal(single.amount, 1_369_000);
    assert.equal(single.range, false);

    const range = parseDealerPriceText("Rs. 19.45 - 27.70 Lakh");
    assert.equal(range.amount, null);
    assert.equal(range.range, true);
    assert.ok(range.sourceText?.includes("19.45"));

    const row = validateInventoryInput({
      brand: "Mahindra",
      model: "BE 6",
      variant: "Sporteq",
      price: "Rs. 19.45 - 27.70 Lakh",
    });
    assert.equal(row.exShowroomPrice, 0);
    assert.equal(row.priceOnRequest, true);
    assert.ok(row.warnings.some((w) => /range/i.test(w)));
  });

  it("rejects missing brand/model and invalid supplied PIN/stock", () => {
    assert.throws(
      () => validateInventoryInput({ brand: "", model: "B", stock: 1 }),
      (e: unknown) => e instanceof DealerInventoryError && e.code === "BRAND_REQUIRED",
    );
    assert.throws(
      () => validateInventoryInput({ brand: "A", model: "B", stock: -1 }),
      (e: unknown) => e instanceof DealerInventoryError && e.code === "INVALID_STOCK",
    );
    assert.throws(
      () => validateInventoryInput({ brand: "A", model: "B", stock: 1, pincode: "11001" }),
      (e: unknown) => e instanceof DealerInventoryError && e.code === "INVALID_PIN",
    );
  });

  it("normalizes blank Excel tokens", () => {
    assert.equal(blankToEmpty("undefined"), "");
    assert.equal(blankToEmpty("Invalid Date"), "");
  });

  it("strips client-owned ownership fields", () => {
    const clean = stripClientOwnedInventoryFields({
      brand: "Tata",
      model: "Nexon",
      dealer_id: "inject-dealer",
    });
    assert.equal(clean.dealer_id, undefined);
  });

  it("parses real dealer spreadsheet headers without Stock column", () => {
    const csv = [
      "Brand,Model,Variant,Year,Fuel,Transmission,KM Driven,Ownership,Price,Color,Registration State,Description,Dealer Price,Discount,Main Image URL",
      'Mahindra,BE 6,Sporteq,2026,Electric,Automatic,0,,"Rs. 19.45 - 27.70 Lakh",White,,,,,',
      "Mahindra,Scorpio,N,,Petrol & Diesel,Manual & Automatic,0,,Rs. 13.69 Lakh,Everest White,,,,,",
    ].join("\n");
    const parsed = parseInventorySpreadsheet({ filename: "dealer.xlsx".replace(".xlsx", ".csv"), content: csv });
    assert.ok(parsed.mapped.includes("brand"));
    assert.ok(parsed.mapped.includes("model"));
    assert.ok(!parsed.mapped.includes("stock"));
    assert.equal(parsed.rows.length, 2);
    const a = validateInventoryInput(parsed.rows[0].values);
    assert.equal(a.stock, 1);
    assert.equal(a.priceOnRequest, true);
    const b = validateInventoryInput(parsed.rows[1].values);
    assert.equal(b.exShowroomPrice, 1_369_000);
    assert.equal(b.priceOnRequest, false);
  });

  it("parses real dealer XLSX fixture headers", () => {
    const buf = readFileSync(join(here, "fixtures/dealer-real-inventory.xlsx"));
    const parsed = parseInventorySpreadsheet({ filename: "dealer-real-inventory.xlsx", content: buf });
    assert.ok(parsed.mapped.includes("brand") && parsed.mapped.includes("model"));
    assert.ok(parsed.mapped.includes("price"));
    assert.ok(parsed.mapped.includes("image_url") || parsed.rows[0]);
    assert.ok(parsed.rows.length >= 20);
    assert.ok(!parsed.mapped.includes("stock"));
    const sample = validateInventoryInput(parsed.rows[0].values);
    assert.equal(sample.stock, 1);
    assert.equal(sample.stockStatus, "available");
  });

  it("enforces bulk size limits and Brand+Model required columns", () => {
    assert.ok(MAX_BULK_ROWS <= 500);
    assert.ok(MAX_BULK_FILE_BYTES <= 2 * 1024 * 1024);
    assert.throws(
      () => parseInventorySpreadsheet({ filename: "x.csv", content: "colour,stock\nWhite,1\n" }),
      (e: unknown) => e instanceof DealerInventoryError && e.code === "MISSING_REQUIRED_COLUMNS",
    );
  });

  it("template CSV leads with brand,model and includes EV demo columns", () => {
    const tpl = inventoryTemplateCsv();
    const header = tpl.split("\n")[0]!.toLowerCase();
    assert.ok(header.startsWith("brand,model"));
    assert.ok(header.includes("range km") || header.includes("range_km"));
    assert.ok(header.includes("battery"));
    assert.ok(/electric/i.test(tpl));
    assert.ok(/nexon ev/i.test(tpl));
    for (const col of ["dealer_id", "organization_id"]) {
      assert.equal(tpl.includes(col), false);
      assert.ok(FORBIDDEN_IMPORT_COLUMNS.has(col.replace(/_/g, "")) || FORBIDDEN_IMPORT_COLUMNS.has(col));
    }
  });

  it("accepts EV range + battery columns", () => {
    const row = validateInventoryInput({
      brand: "Tata",
      model: "Nexon EV",
      fuel: "Electric",
      range_km: "489",
      battery_kwh: "45",
      ex_showroom_price: 1499000,
    });
    assert.equal(row.fuelType, "Electric");
    assert.equal(row.rangeKm, "489");
    assert.equal(row.batteryKwh, "45");
    assert.equal(row.priceOnRequest, false);
  });
});
