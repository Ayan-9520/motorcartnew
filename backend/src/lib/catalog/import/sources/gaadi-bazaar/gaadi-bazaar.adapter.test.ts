import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { businessKeyFromLabels } from "../../../business-key";
import type { CatalogVariantRecord } from "../../../types";
import { runAdapterLifecycle } from "../adapter-runner";
import { GaadiBazaarAdapter, createGaadiBazaarContext } from "./gaadi-bazaar.adapter";
import { runGaadiBazaarImportPipeline } from "./gaadi-bazaar-import.pipeline";
import { mapGaadiBazaarPayload, mappedRowsToImportRecords } from "./gaadi-bazaar-mapper";
import type { GaadiBazaarScraperPayload } from "./gaadi-bazaar-types";
import { DEFAULT_CATALOG_IMPORT_SEGMENT } from "../../catalog-segment";

const FIXTURE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");
const SAMPLE_INPUT = JSON.parse(
  fs.readFileSync(path.join(FIXTURE_DIR, "gaadi-bazaar-sample-input.json"), "utf8"),
) as GaadiBazaarScraperPayload;
const SAMPLE_OUTPUT = JSON.parse(
  fs.readFileSync(path.join(FIXTURE_DIR, "gaadi-bazaar-sample-output.json"), "utf8"),
);

const CATALOG_VARIANT: CatalogVariantRecord = {
  id: "variant-creta-sx-diesel-at",
  segment: "car",
  brandSlug: "hyundai",
  brandName: "Hyundai",
  modelSlug: "creta",
  modelName: "Creta",
  variantSlug: "sx-o-1-5-diesel-automatic",
  variantName: "SX(O) 1.5 Diesel Automatic",
  fuelType: "diesel",
  transmission: "at",
  modelYear: 2025,
  businessKey: businessKeyFromLabels({
    segment: "car",
    brand: "hyundai",
    model: "creta",
    variant: "sx-o-1-5-diesel-automatic",
    fuel: "diesel",
    transmission: "at",
    modelYear: 2025,
  }),
};

describe("GaadiBazaar mapper", () => {
  it("maps scraper payload to ImportRecord using unified normalizer", () => {
    const rows = mapGaadiBazaarPayload(SAMPLE_INPUT);
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.issues.length, 0);
    assert.equal(rows[0]?.importRecord?.fields.brand, "hyundai");
    assert.equal(rows[0]?.importRecord?.segment, DEFAULT_CATALOG_IMPORT_SEGMENT);
    assert.equal(rows[0]?.importRecord?.fields.imageUrl, "https://cdn.example.com/gaadi/creta-front.jpg");
    assert.equal(rows[0]?.importRecord?.fields.images, "https://cdn.example.com/gaadi/creta-side.jpg");
    assert.equal(rows[0]?.importRecord?.fields.source_id, "gb-creta-12345");
  });

  it("matches committed sample normalized output fixture", () => {
    const records = mappedRowsToImportRecords(mapGaadiBazaarPayload(SAMPLE_INPUT));
    assert.equal(records.length, SAMPLE_OUTPUT.length);
    assert.deepEqual(records[0]?.fields.brand, SAMPLE_OUTPUT[0].fields.brand);
    assert.deepEqual(records[0]?.fields.model, SAMPLE_OUTPUT[0].fields.model);
    assert.deepEqual(records[0]?.fields.fuel, SAMPLE_OUTPUT[0].fields.fuel);
    assert.deepEqual(records[0]?.fields.transmission, SAMPLE_OUTPUT[0].fields.transmission);
    assert.deepEqual(records[0]?.fields.exShowroomPrice, SAMPLE_OUTPUT[0].fields.exShowroomPrice);
    assert.deepEqual(records[1]?.fields.brand, SAMPLE_OUTPUT[1].fields.brand);
  });
});

describe("GaadiBazaarAdapter lifecycle", () => {
  it("runs read-only ingest lifecycle without HTTP", async () => {
    const adapter = new GaadiBazaarAdapter();
    const context = createGaadiBazaarContext(SAMPLE_INPUT, { dryRun: true });
    const result = await runAdapterLifecycle(adapter, context);

    assert.equal(result.success, true);
    assert.equal(context.records.length, 2);
    assert.equal(context.connection?.endpoint, "read-only://gaadi-bazaar/scraper-payload");
    assert.equal(context.fetch?.recordCount, 2);
  });

  it("does not perform external fetch", async () => {
    const adapter = new GaadiBazaarAdapter();
    const context = createGaadiBazaarContext(SAMPLE_INPUT);
    const fetch = await adapter.fetch(context);
    assert.equal(fetch.success, true);
    if (fetch.success) {
      assert.equal((fetch.data.raw as GaadiBazaarScraperPayload).vehicles.length, 2);
    }
  });
});

describe("runGaadiBazaarImportPipeline", () => {
  it("reuses unified catalog import pipeline modules", async () => {
    const result = await runGaadiBazaarImportPipeline(SAMPLE_INPUT, {
      catalogVariants: [CATALOG_VARIANT],
    });

    assert.equal(result.pipeline.success, true);
    assert.equal(result.validation?.summary.validCount, 2);
    assert.ok(result.duplicates);
    assert.ok(result.media);
    assert.equal(result.matching?.length, 2);
    assert.equal(result.matching?.[0]?.method, "exact");
    assert.equal(result.matching?.[0]?.catalogVariantId, CATALOG_VARIANT.id);
    assert.equal(result.pipeline.context.storage?.dryRun, true);
  });

  it("never writes to database", async () => {
    const result = await runGaadiBazaarImportPipeline(SAMPLE_INPUT, { skipMatching: true });
    assert.equal(result.pipeline.context.dryRun, true);
    assert.ok(!("prisma" in result.pipeline.context.metadata));
  });
});

describe("invalid scraper rows", () => {
  it("surfaces mapping and validation issues", async () => {
    const payload: GaadiBazaarScraperPayload = {
      vehicles: [{ vehicleTitle: "Incomplete listing" }],
    };
    const adapter = new GaadiBazaarAdapter();
    const context = createGaadiBazaarContext(payload);
    const validate = await adapter.validate(context);
    assert.equal(validate.success, true);
    if (validate.success) {
      assert.equal(validate.data.valid, false);
      assert.ok(validate.data.issues.some((i) => i.code === "NORMALIZE_PREVIEW"));
    }
  });
});
