import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { NEVER_ALLOW_TABLES, NAMED_QUERY_OPERATIONS, authorizeLegacyQuery } from "@/lib/db/query-allowlist";
import {
  EXCLUDED_NEW_CAR_STOCK_STATUSES,
  isAvailableMarketplaceVehicle,
  isAvailableNewCarStock,
} from "./availability";
import { InventoryError } from "./errors";
import { INDIA_PIN_RE, isIndiaCompatibleCountry, pincodeFromSearchParams, validateIndiaPincode } from "./pin";
import {
  assertPublicSafeItem,
  emptyStockByPinResponse,
  serializeInventoryItem,
  serializeVehicleItem,
} from "./serialize";

const here = dirname(fileURLToPath(import.meta.url));

describe("Phase 5C PIN validation", () => {
  it("accepts valid India 6-digit PINs", () => {
    for (const pin of ["110001", "400001", "160001"]) {
      assert.equal(validateIndiaPincode(pin), pin);
      assert.match(pin, INDIA_PIN_RE);
    }
  });

  it("rejects invalid PIN formats with HTTP 400 semantics", () => {
    for (const pin of ["000000", "12345", "1234567", "abcdef", "", " 1100010"]) {
      assert.throws(
        () => validateIndiaPincode(pin),
        (e: unknown) => e instanceof InventoryError && e.status === 400 && e.code === "INVALID_PINCODE",
      );
    }
  });

  it("does not silently rewrite a PIN", () => {
    assert.throws(() => validateIndiaPincode("0110001"));
    assert.equal(validateIndiaPincode("110001"), "110001");
  });

  it("reads only pincode from query params and ignores dealerId", () => {
    const sp = new URLSearchParams("pincode=110001&dealerId=otherdealer&organizationId=org&branchId=br");
    assert.equal(pincodeFromSearchParams(sp), "110001");
  });
});

describe("Phase 5C stock availability allow-list", () => {
  it("includes available stock greater than zero", () => {
    assert.equal(isAvailableNewCarStock(1, "available"), true);
    assert.equal(isAvailableNewCarStock(3, "Available"), true);
  });

  it("excludes stock = 0", () => {
    assert.equal(isAvailableNewCarStock(0, "available"), false);
  });

  it("excludes known unavailable statuses", () => {
    for (const status of EXCLUDED_NEW_CAR_STOCK_STATUSES) {
      assert.equal(isAvailableNewCarStock(5, status), false, status);
    }
  });

  it("excludes unknown stockStatus", () => {
    assert.equal(isAvailableNewCarStock(2, "mystery"), false);
    assert.equal(isAvailableNewCarStock(2, ""), false);
    assert.equal(isAvailableNewCarStock(2, null), false);
  });

  it("includes available marketplace vehicles and excludes reserved/sold/deleted", () => {
    assert.equal(isAvailableMarketplaceVehicle("available", null), true);
    assert.equal(isAvailableMarketplaceVehicle("reserved", null), false);
    assert.equal(isAvailableMarketplaceVehicle("sold", null), false);
    assert.equal(isAvailableMarketplaceVehicle("draft", null), false);
    assert.equal(isAvailableMarketplaceVehicle("available", new Date()), false);
  });
});

describe("Phase 5C public serialization", () => {
  it("omits customer PII, GST/PAN, and organization secrets", () => {
    const item = serializeInventoryItem({
      inventoryId: "inv-1",
      dealer: { id: "d1", name: "A Motors", city: "Delhi", state: "DL" },
      stock: 2,
      brand: "Hyundai",
      model: "Creta",
    });
    assertPublicSafeItem(item);
    const blob = JSON.stringify(item);
    assert.equal(blob.includes("gst"), false);
    assert.equal(blob.includes("pan"), false);
    assert.equal(blob.includes("email"), false);
    assert.equal(blob.includes("phone"), false);
    assert.equal(blob.includes("password"), false);
    assert.equal(item.source, "new_car_inventory");
  });

  it("never labels catalog-only rows as stock", () => {
    const item = serializeVehicleItem({
      vehicleId: "v1",
      dealer: { id: "d1", name: "A Motors", city: "Delhi", state: "DL" },
      brand: "Hyundai",
      model: "Creta",
      slug: "creta",
      catalogVariantId: "cat-1",
    });
    assert.equal(item.source, "vehicle");
    assert.notEqual(item.source, "catalog");
    assert.equal(item.catalogVariantId, "cat-1");
  });

  it("empty PIN match is a truthful empty list", () => {
    const empty = emptyStockByPinResponse("110001");
    assert.deepEqual(empty, { pincode: "110001", count: 0, items: [] });
  });

  it("does not attach radius, distance, nearest, or coordinates", () => {
    const item = serializeInventoryItem({
      inventoryId: "inv-1",
      dealer: { id: "d1", name: "A Motors", city: "Delhi", state: "DL" },
      stock: 1,
      brand: "Hyundai",
      model: "Creta",
      branch: { id: "b1", name: "CP", pincode: "110001" },
    });
    const blob = JSON.stringify(item);
    assert.equal(blob.includes("distance"), false);
    assert.equal(blob.includes("radius"), false);
    assert.equal(blob.includes("nearest"), false);
    assert.equal(blob.includes("latitude"), false);
    assert.equal(blob.includes("longitude"), false);
    assert.equal(blob.includes("haversine"), false);
  });
});

describe("Phase 5C India country matching is exact PIN, not geo", () => {
  it("accepts India-compatible country codes only", () => {
    assert.equal(isIndiaCompatibleCountry("IN"), true);
    assert.equal(isIndiaCompatibleCountry("India"), true);
    assert.equal(isIndiaCompatibleCountry("US"), false);
    assert.equal(isIndiaCompatibleCountry(null), false);
  });
});

describe("Phase 5C does not use /api/db/query", () => {
  it("does not register a named db/query operation for PIN stock", () => {
    assert.equal(NAMED_QUERY_OPERATIONS.includes("inventory_by_pincode" as never), false);
    assert.equal(NAMED_QUERY_OPERATIONS.includes("stock_by_pin" as never), false);
  });

  it("keeps organization branches off the generic query bus", () => {
    assert.equal(NEVER_ALLOW_TABLES.has("organization_branches"), true);
    assert.equal(NEVER_ALLOW_TABLES.has("organizations"), true);
    const decision = authorizeLegacyQuery(
      { userId: "u1", role: "super_admin" },
      { table: "organization_branches", action: "select" },
      new Set(["organization_branches"]),
    );
    assert.equal(decision.ok, false);
  });

  it("service and route do not call db/query", () => {
    const service = readFileSync(join(here, "../../services/inventory-by-pincode.service.ts"), "utf8");
    const route = readFileSync(join(here, "../../app/api/inventory/by-pincode/route.ts"), "utf8");
    assert.equal(service.includes("db/query"), false);
    assert.equal(route.includes("db/query"), false);
    assert.equal(service.includes("MOCK_"), false);
    assert.equal(route.includes("getAuthUser"), false);
  });
});
