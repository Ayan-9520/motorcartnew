import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Part } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { PARTS_DESK_NAME, PARTS_DESK_SELLER_ID, priceLine, serializePart } from "./parts-store.service";

function part(overrides: Partial<Part> = {}): Part {
  return {
    id: "p1",
    sellerId: PARTS_DESK_SELLER_ID,
    name: "Bosch Brake Pad Set",
    slug: "bosch-brake-pad-set",
    category: "brake-parts",
    brand: "Bosch",
    price: BigInt(1180),
    originalPrice: BigInt(1400),
    stock: 20,
    rating: new Prisma.Decimal(0),
    reviewCount: 0,
    images: [],
    compatibility: ["Maruti Swift"],
    isFeatured: false,
    isActive: true,
    sku: "MCPD-BRK-001",
    metadata: { mrp: 1400, wholesale_price: 1000, bulk_min_qty: 5, gst_rate: 18, vehicle_hubs: ["cars"], hsn_code: "8708" },
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("parts store pricing", () => {
  it("serializes desk parts with seller name and metadata", () => {
    const s = serializePart(part());
    assert.equal(s.sellerName, PARTS_DESK_NAME);
    assert.equal(s.price, 1180);
    assert.equal(s.mrp, 1400);
    assert.equal(s.wholesalePrice, 1000);
    assert.equal(s.bulkMinQty, 5);
    assert.deepEqual(s.vehicleHubs, ["cars"]);
    assert.equal(s.hsnCode, "8708");
  });

  it("splits GST out of the inclusive retail price", () => {
    const line = priceLine(serializePart(part()), 2);
    assert.equal(line.wholesaleApplied, false);
    assert.equal(line.lineTotal, 2360);
    assert.equal(line.lineSubtotal, 2000);
    assert.equal(line.lineGst, 360);
  });

  it("applies wholesale price at the bulk MOQ", () => {
    const line = priceLine(serializePart(part()), 5);
    assert.equal(line.wholesaleApplied, true);
    assert.equal(line.unitPrice, 1000);
    assert.equal(line.lineTotal, 5000);
  });

  it("ignores wholesale when it is not cheaper", () => {
    const line = priceLine(serializePart(part({ metadata: { wholesale_price: 1500, bulk_min_qty: 2 } })), 4);
    assert.equal(line.wholesaleApplied, false);
    assert.equal(line.unitPrice, 1180);
  });
});
