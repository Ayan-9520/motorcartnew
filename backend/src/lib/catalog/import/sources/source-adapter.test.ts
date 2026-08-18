import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AdapterContext } from "./adapter-context";
import { AdapterFactory, createAdapterFactory, createSourceAdapter } from "./adapter-factory";
import { runAdapterLifecycle, ADAPTER_STAGES } from "./adapter-runner";
import { MockSourceAdapter } from "./mock-source.adapter";
import { SourceRegistry } from "./source-registry";
import { adapterFailure, adapterSuccess, SOURCE_ADAPTER_KINDS } from "./adapter-types";
import type { SourceAdapterKind } from "./adapter-types";
import { GaadiBazaarAdapter } from "./gaadi-bazaar/gaadi-bazaar.adapter";

describe("AdapterContext", () => {
  it("tracks stage lifecycle and artifacts", () => {
    const ctx = AdapterContext.create("csv", { dryRun: true, initiatedBy: "ops@motorcart.in" });
    ctx.beginStage("connect");
    ctx.completeStage("connect", true, "ok");
    ctx.setNormalized({ recordCount: 1, records: [{ rowNumber: 1, segment: "car", fields: { brand: "Tata" } }] });

    assert.equal(ctx.sourceId, "csv");
    assert.equal(ctx.dryRun, true);
    assert.equal(ctx.records.length, 1);
    assert.equal(ctx.stageLogs.length, 1);
  });
});

describe("AdapterResult helpers", () => {
  it("builds success and failure results", () => {
    const ok = adapterSuccess("fetch", { raw: [], fetchedAt: new Date().toISOString() });
    assert.equal(ok.success, true);
    const fail = adapterFailure("connect", "CONN_FAIL", "failed");
    assert.equal(fail.success, false);
    if (!fail.success) assert.equal(fail.error.code, "CONN_FAIL");
  });
});

describe("SourceRegistry", () => {
  it("registers and lists default sources", () => {
    const registry = new SourceRegistry(true);
    assert.equal(registry.has("gaadi_bazaar"), true);
    assert.equal(registry.has("json_api"), true);
    assert.deepEqual(registry.list().sort(), [...SOURCE_ADAPTER_KINDS].sort());
  });

  it("throws for unknown source", () => {
    const registry = new SourceRegistry(false);
    assert.throws(() => registry.get("csv"), /not registered/);
  });

  it("allows custom adapter registration", () => {
    const registry = new SourceRegistry(false);
    registry.register("csv", MockSourceAdapter);
    const adapter = new (registry.get("csv"))();
    assert.equal(adapter.sourceId, "csv");
  });
});

describe("AdapterFactory", () => {
  it("creates placeholder adapters by kind", () => {
    const factory = createAdapterFactory();
    for (const kind of SOURCE_ADAPTER_KINDS) {
      const adapter = factory.create(kind);
      assert.equal(adapter.sourceId, kind);
      assert.ok(adapter.displayName.length > 0);
    }
  });

  it("creates adapter with context", () => {
    const factory = new AdapterFactory();
    const { adapter, context } = factory.createWithContext("oem_feed", { dryRun: true });
    assert.equal(adapter.sourceId, "oem_feed");
    assert.equal(context.sourceId, "oem_feed");
  });
});

describe("GaadiBazaar adapter registration", () => {
  it("factory creates GaadiBazaarAdapter (Phase 4B)", () => {
    const adapter = createSourceAdapter("gaadi_bazaar");
    assert.equal(adapter.sourceId, "gaadi_bazaar");
    assert.equal(adapter.displayName, "GaadiBazaar");
  });

  it("requires scraper payload on connect", async () => {
    const adapter = new GaadiBazaarAdapter();
    const result = await adapter.connect(AdapterContext.create("gaadi_bazaar"));
    assert.equal(result.success, false);
    if (!result.success) assert.equal(result.error.code, "PAYLOAD_MISSING");
  });
});

describe("placeholder adapters (framework only)", () => {
  it("does not implement fetch for default placeholders", async () => {
    const kinds: SourceAdapterKind[] = ["cardekho", "csv", "excel", "dealer_upload"];
    for (const kind of kinds) {
      const adapter = createSourceAdapter(kind);
      const result = await adapter.fetch(AdapterContext.create(kind));
      assert.equal(result.success, false, `expected NOT_IMPLEMENTED for ${kind}`);
    }
  });

  it("registers JsonApiSourceAdapter (requires configured URL)", async () => {
    const adapter = createSourceAdapter("json_api");
    assert.equal(adapter.sourceId, "json_api");
    const result = await adapter.connect(AdapterContext.create("json_api"));
    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, "CATALOG_MASTER_SOURCE_URL_NOT_CONFIGURED");
    }
  });
});

describe("MockSourceAdapter lifecycle", () => {
  it("runs full connect through disconnect", async () => {
    const adapter = new MockSourceAdapter("csv");
    const context = AdapterContext.create("csv");
    const result = await runAdapterLifecycle(adapter, context);

    assert.equal(result.success, true);
    assert.deepEqual(result.completedStages, [...ADAPTER_STAGES]);
    assert.equal(context.connection?.connected, false);
    assert.equal(context.records.length, 1);
    assert.equal(context.stageLogs.length, ADAPTER_STAGES.length);
  });
});

describe("runAdapterLifecycle failure", () => {
  it("stops at first failed stage for placeholder without payload", async () => {
    const adapter = new GaadiBazaarAdapter();
    const context = AdapterContext.create("gaadi_bazaar");
    const result = await runAdapterLifecycle(adapter, context);

    assert.equal(result.success, false);
    assert.equal(result.failedStage, "connect");
    assert.deepEqual(result.completedStages, []);
    assert.equal(context.errors.length, 1);
  });
});

describe("no database or API side effects", () => {
  it("framework is in-memory only", async () => {
    const adapter = new MockSourceAdapter("json_api");
    const context = AdapterContext.create("json_api");
    await runAdapterLifecycle(adapter, context);
    assert.ok(!("prisma" in context.metadata));
    assert.equal(context.dryRun, true);
  });
});
