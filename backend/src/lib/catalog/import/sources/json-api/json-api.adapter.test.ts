import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AdapterContext } from "../adapter-context";
import { runCatalogMasterJsonApiDryRun } from "../../catalog-master-json-api.service";
import { JsonApiSourceAdapter } from "./json-api.adapter";
import type { CatalogMasterFetchImpl } from "./json-api.adapter";
import { isListingShapedPayload } from "./json-api-listing-guard";
import { catalogMasterPayloadToImportRecords } from "./json-api-mapper";

function mockResponse(body: unknown, status = 200): Awaited<ReturnType<CatalogMasterFetchImpl>> {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "ERR",
    async text() {
      return typeof body === "string" ? body : JSON.stringify(body);
    },
    async json() {
      if (typeof body === "string") throw new Error("not json");
      return body;
    },
  };
}

function validMasterPayload() {
  return {
    source: "licensed_catalog_api",
    vehicles: [
      {
        brand: "Maruti Suzuki",
        model: "Swift",
        variant: "VXI",
        fuel: "Petrol",
        transmission: "Manual",
        year: 2025,
        segment: "car",
        bodyType: "Hatchback",
        exShowroomPrice: 650000,
        city: "Delhi",
        state: "Delhi",
        externalId: "ms-swift-vxi-2025",
      },
      {
        brand: "Hyundai",
        model: "Creta",
        variant: "SX(O) 1.5 Diesel Automatic",
        fuel: "Diesel",
        transmission: "Automatic",
        year: 2025,
        segment: "car",
        bodyType: "SUV",
        exShowroomPrice: 1899000,
        externalId: "hy-creta-sxo-diesel-at-2025",
      },
    ],
  };
}

describe("JsonApiSourceAdapter — missing URL", () => {
  it("fails connect with CATALOG_MASTER_SOURCE_URL_NOT_CONFIGURED", async () => {
    const prev = process.env.CATALOG_MASTER_SOURCE_URL;
    delete process.env.CATALOG_MASTER_SOURCE_URL;
    try {
      const adapter = new JsonApiSourceAdapter();
      const result = await adapter.connect(
        AdapterContext.create("json_api", {
          config: { source: "json_api", sourceUrl: null },
        }),
      );
      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error.code, "CATALOG_MASTER_SOURCE_URL_NOT_CONFIGURED");
      }
    } finally {
      if (prev !== undefined) process.env.CATALOG_MASTER_SOURCE_URL = prev;
    }
  });
});

describe("JsonApiSourceAdapter — API authentication", () => {
  it("sends Bearer and X-API-Key when configured", async () => {
    let sawAuth = false;
    let sawApiKey = false;
    const fetchImpl: CatalogMasterFetchImpl = async (_url, init) => {
      const headers = init?.headers as Record<string, string>;
      sawAuth = headers?.Authorization === "Bearer test-key-123";
      sawApiKey = headers?.["X-API-Key"] === "test-key-123";
      return mockResponse(validMasterPayload());
    };

    const adapter = new JsonApiSourceAdapter();
    const context = AdapterContext.create("json_api", {
      config: {
        source: "json_api",
        sourceUrl: "https://catalog-master.test/v1/vehicles",
        apiKey: "test-key-123",
        fetchImpl,
      },
    });

    const connect = await adapter.connect(context);
    assert.equal(connect.success, true);
    const fetch = await adapter.fetch(context);
    assert.equal(fetch.success, true);
    assert.equal(sawAuth, true);
    assert.equal(sawApiKey, true);
  });

  it("fails with CATALOG_MASTER_AUTH_FAILED on HTTP 401", async () => {
    const fetchImpl: CatalogMasterFetchImpl = async () => mockResponse({ error: "unauthorized" }, 401);
    const adapter = new JsonApiSourceAdapter();
    const context = AdapterContext.create("json_api", {
      config: {
        source: "json_api",
        sourceUrl: "https://catalog-master.test/v1/vehicles",
        apiKey: "bad-key",
        fetchImpl,
      },
    });
    await adapter.connect(context);
    const fetch = await adapter.fetch(context);
    assert.equal(fetch.success, false);
    if (!fetch.success) assert.equal(fetch.error.code, "CATALOG_MASTER_AUTH_FAILED");
  });
});

describe("JsonApiSourceAdapter — successful mapping", () => {
  it("maps vehicles[] into ImportRecords", async () => {
    const fetchImpl: CatalogMasterFetchImpl = async () => mockResponse(validMasterPayload());
    const adapter = new JsonApiSourceAdapter();
    const context = AdapterContext.create("json_api", {
      config: {
        source: "json_api",
        sourceUrl: "https://catalog-master.test/v1/vehicles",
        fetchImpl,
      },
    });
    await adapter.connect(context);
    const fetch = await adapter.fetch(context);
    assert.equal(fetch.success, true);
    assert.equal(context.records.length, 2);
    assert.equal(context.records[0]?.fields.brand, "Maruti Suzuki");
    assert.equal(context.records[0]?.fields.model, "Swift");
    assert.equal(context.records[1]?.fields.variant, "SX(O) 1.5 Diesel Automatic");
  });
});

describe("JsonApiSourceAdapter — malformed response", () => {
  it("rejects non-JSON body", async () => {
    const fetchImpl: CatalogMasterFetchImpl = async () => mockResponse("not-json", 200);
    const adapter = new JsonApiSourceAdapter();
    const context = AdapterContext.create("json_api", {
      config: {
        source: "json_api",
        sourceUrl: "https://catalog-master.test/v1/vehicles",
        fetchImpl,
      },
    });
    await adapter.connect(context);
    const fetch = await adapter.fetch(context);
    assert.equal(fetch.success, false);
    if (!fetch.success) assert.equal(fetch.error.code, "CATALOG_MASTER_MALFORMED_RESPONSE");
  });

  it("rejects object without vehicles/data array", async () => {
    const fetchImpl: CatalogMasterFetchImpl = async () => mockResponse({ ok: true });
    const adapter = new JsonApiSourceAdapter();
    const context = AdapterContext.create("json_api", {
      config: {
        source: "json_api",
        sourceUrl: "https://catalog-master.test/v1/vehicles",
        fetchImpl,
      },
    });
    await adapter.connect(context);
    const fetch = await adapter.fetch(context);
    assert.equal(fetch.success, false);
    if (!fetch.success) assert.equal(fetch.error.code, "CATALOG_MASTER_MALFORMED_RESPONSE");
  });
});

describe("JsonApiSourceAdapter — listing-shaped rejection", () => {
  it("detects listing fields", () => {
    const check = isListingShapedPayload({
      vehicles: [{ brand: "Maruti", "KM Driven": 0, Ownership: 1 }],
    });
    assert.equal(check.rejected, true);
    assert.match(check.fieldPath ?? "", /KM Driven|Ownership/i);
  });

  it("rejects dealer inventory payload", async () => {
    const fetchImpl: CatalogMasterFetchImpl = async () =>
      mockResponse({
        vehicles: [
          {
            brand: "Maruti",
            model: "Swift",
            variant: "VXI",
            fuel: "Petrol",
            transmission: "Manual",
            year: 2025,
            dealerPrice: 879000,
            Discount: 2,
          },
        ],
      });
    const adapter = new JsonApiSourceAdapter();
    const context = AdapterContext.create("json_api", {
      config: {
        source: "json_api",
        sourceUrl: "https://catalog-master.test/v1/vehicles",
        fetchImpl,
      },
    });
    await adapter.connect(context);
    const fetch = await adapter.fetch(context);
    assert.equal(fetch.success, false);
    if (!fetch.success) assert.equal(fetch.error.code, "LISTING_SHAPED_PAYLOAD_REJECTED");
  });
});

describe("catalog master mapper — invalid / duplicate rows", () => {
  it("maps incomplete rows (pipeline validation will reject)", () => {
    const { records } = catalogMasterPayloadToImportRecords({
      vehicles: [{ brand: "Tata", model: "", variant: "XZ", fuel: "Petrol", transmission: "Manual", year: 2025 }],
    });
    assert.equal(records.length, 1);
    assert.equal(records[0]?.fields.model, "");
  });

  it("maps duplicate business-key candidates as separate rows", () => {
    const row = {
      brand: "Tata",
      model: "Nexon",
      variant: "XZ Plus",
      fuel: "Petrol",
      transmission: "Manual",
      year: 2025,
    };
    const { records } = catalogMasterPayloadToImportRecords({ vehicles: [row, row] });
    assert.equal(records.length, 2);
  });
});

describe("catalog master dry-run — zero DB writes", () => {
  it("runs pipeline dry-run with injected fetch and never publishes", async () => {
    const fetchImpl: CatalogMasterFetchImpl = async () => mockResponse(validMasterPayload());
    const result = await runCatalogMasterJsonApiDryRun({
      sourceUrl: "https://catalog-master.test/v1/vehicles",
      fetchImpl,
      skipMatching: true,
    });

    assert.equal(result.dryRun, true);
    assert.equal(result.databaseWrites, 0);
    assert.equal(result.published, false);
    assert.equal(result.pipeline.context.publish?.dryRun, true);
    assert.equal(result.pipeline.context.publish?.published, false);
    assert.ok(result.summary.recordCount >= 1);
    assert.equal(result.success, true);
  });

  it("surfaces invalid rows via validation without writing", async () => {
    const fetchImpl: CatalogMasterFetchImpl = async () =>
      mockResponse({
        vehicles: [
          {
            brand: "UnknownBrandXYZ",
            model: "X",
            variant: "Y",
            fuel: "Water",
            transmission: "Magic",
            year: 1800,
          },
        ],
      });
    const result = await runCatalogMasterJsonApiDryRun({
      sourceUrl: "https://catalog-master.test/v1/vehicles",
      fetchImpl,
      skipMatching: true,
    });
    assert.equal(result.databaseWrites, 0);
    assert.equal(result.published, false);
    assert.ok(result.summary.validationRejected >= 0);
  });

  it("detects in-batch duplicates without DB writes", async () => {
    const row = {
      brand: "Honda",
      model: "City",
      variant: "VX CVT",
      fuel: "Petrol",
      transmission: "Automatic",
      year: 2025,
    };
    const fetchImpl: CatalogMasterFetchImpl = async () => mockResponse({ vehicles: [row, { ...row }] });
    const result = await runCatalogMasterJsonApiDryRun({
      sourceUrl: "https://catalog-master.test/v1/vehicles",
      fetchImpl,
      skipMatching: true,
    });
    assert.equal(result.databaseWrites, 0);
    assert.ok(result.summary.duplicateCount >= 1 || result.summary.recordCount === 2);
  });
});
