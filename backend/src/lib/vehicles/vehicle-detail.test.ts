import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  emptyVehicleDetail,
  mapCatalogVariant,
  mapDealerInventory,
  mapMarketplaceVehicle,
  toFiniteNumber,
  toLegacyListingPayload,
} from "./vehicle-detail.service";

describe("vehicle detail mapping", () => {
  it("maps marketplace vehicles with dealer and price", () => {
    const detail = mapMarketplaceVehicle({
      id: "veh-1",
      slug: "hyundai-creta",
      title: "Hyundai Creta",
      brand: "Hyundai",
      model: "Creta",
      variant: "SX",
      year: 2024,
      price: 1200000,
      fuelType: "Petrol",
      transmission: "Automatic",
      bodyType: "SUV",
      category: "used-cars",
      location: null,
      city: "Pune",
      state: "Maharashtra",
      images: ["https://cdn.example/a.jpg"],
      status: "available",
      catalogVariantId: null,
      dealerId: "d1",
      dealer: { id: "d1", name: "City Motors", slug: "city-motors", city: "Pune", phone: "9999999999", isVerified: true },
    });
    assert.equal(detail.source_type, "marketplace");
    assert.equal(detail.purchasable, true);
    assert.equal(detail.price, 1200000);
    assert.equal(detail.dealer?.name, "City Motors");
    assert.equal(detail.location, "Pune, Maharashtra");
  });

  it("does not invent missing marketplace fields", () => {
    const detail = emptyVehicleDetail({ id: "x", source_type: "marketplace" });
    assert.equal(detail.price, null);
    assert.equal(detail.dealer, null);
    assert.equal(detail.purchasable, false);
  });

  it("maps dealer inventory as purchasable when in stock", () => {
    const detail = mapDealerInventory(
      {
        id: "inv-1",
        dealerId: "d1",
        brand: "Hyundai",
        model: "Creta",
        variant: "SX(O)",
        year: 2025,
        fuelType: "Diesel",
        transmission: "Automatic",
        exShowroomPrice: 1500000,
        onRoadPrice: null,
        price: null,
        stockStatus: "available",
        stock: 2,
        imageUrl: null,
        catalogVariantId: "cat-1",
      },
      { id: "d1", name: "Arena", slug: "arena", city: "Delhi", phone: null, is_verified: true },
    );
    assert.equal(detail.source_type, "dealer_inventory");
    assert.equal(detail.purchasable, true);
    assert.equal(detail.price, 1500000);
    assert.equal(detail.location, "Delhi");
  });

  it("catalog variants are never purchasable", () => {
    const detail = mapCatalogVariant({
      id: "cat-1",
      name: "SX(O) 1.5 Diesel",
      slug: "sxo-15-diesel",
      fuelType: "Diesel",
      transmission: "Automatic",
      modelYear: 2025,
      exShowroomRef: 1800000,
      status: "published",
      model: { name: "Creta", bodyType: "SUV", brand: { name: "Hyundai" } },
      media: [],
    });
    assert.equal(detail.source_type, "catalog");
    assert.equal(detail.purchasable, false);
    assert.equal(detail.dealer, null);
    const legacy = toLegacyListingPayload(detail);
    assert.equal(legacy.vehicle.status, "draft");
    assert.equal((legacy.vehicle.metadata as { purchasable: boolean }).purchasable, false);
  });

  it("handles invalid ids as empty lookup key", () => {
    assert.equal(toFiniteNumber("nope"), null);
    assert.equal(toFiniteNumber(undefined), null);
  });
});
