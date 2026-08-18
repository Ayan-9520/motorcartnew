import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  catalogImportJobIdSchema,
  catalogImportStartBodySchema,
} from "./catalog-import-admin.validation";

describe("catalogImportStartBodySchema", () => {
  it("accepts a valid GaadiBazaar start payload", () => {
    const parsed = catalogImportStartBodySchema.parse({
      source: "gaadi_bazaar",
      city: "Delhi",
      search: "maruti",
      pages: 5,
    });

    assert.equal(parsed.source, "gaadi_bazaar");
    assert.equal(parsed.city, "Delhi");
    assert.equal(parsed.search, "maruti");
    assert.equal(parsed.pages, 5);
  });

  it("defaults pages to 1", () => {
    const parsed = catalogImportStartBodySchema.parse({ source: "gaadi_bazaar" });
    assert.equal(parsed.pages, 1);
  });

  it("rejects unsupported sources", () => {
    assert.throws(() => catalogImportStartBodySchema.parse({ source: "other" }));
  });

  it("accepts json_api catalog master source", () => {
    const parsed = catalogImportStartBodySchema.parse({ source: "json_api", segment: "car" });
    assert.equal(parsed.source, "json_api");
    assert.equal(parsed.segment, "car");
  });

  it("rejects invalid page counts", () => {
    assert.throws(() =>
      catalogImportStartBodySchema.parse({ source: "gaadi_bazaar", pages: 0 }),
    );
    assert.throws(() =>
      catalogImportStartBodySchema.parse({ source: "gaadi_bazaar", pages: 100 }),
    );
  });

  it("trims city and search strings", () => {
    const parsed = catalogImportStartBodySchema.parse({
      source: "gaadi_bazaar",
      city: "  Delhi  ",
      search: "  maruti  ",
    });
    assert.equal(parsed.city, "Delhi");
    assert.equal(parsed.search, "maruti");
  });
});

describe("catalogImportJobIdSchema", () => {
  it("accepts catalog import job ids", () => {
    const id = catalogImportJobIdSchema.parse("catalog-import-550e8400-e29b-41d4-a716-446655440000");
    assert.match(id, /^catalog-import-/);
  });

  it("rejects empty or malformed ids", () => {
    assert.throws(() => catalogImportJobIdSchema.parse(""));
    assert.throws(() => catalogImportJobIdSchema.parse("bad id with spaces"));
  });
});
