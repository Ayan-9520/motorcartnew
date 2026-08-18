import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { selectApprovedPublishCandidates } from "./catalog-publish-candidates";
import { resolveCatalogPublishStorage } from "./catalog-publish-storage";
import {
  clearCatalogPublishLocks,
  runCatalogPublishEngine,
} from "./catalog-publish.engine";
import type { CatalogImportApprovalDecision } from "../catalog-import-approval.types";
import type { CatalogImportPreviewRecord } from "../catalog-import-preview.types";
import type { ImportRecord } from "../import-types";
import type { StorageProvider } from "../../../storage/storage-types";
import { storageSuccess } from "../../../storage/storage-types";

function previewRow(partial: Partial<CatalogImportPreviewRecord> & { id: string; rowNumber: number }): CatalogImportPreviewRecord {
  return {
    status: "valid",
    imageUrl: null,
    brand: "Hyundai",
    model: "Creta",
    variant: "SX",
    fuel: "Petrol",
    transmission: "Manual",
    price: "1200000",
    city: "Delhi",
    matchConfidence: 100,
    matchMethod: "exact",
    duplicateReason: null,
    validationErrors: [],
    approvalStatus: "APPROVED",
    ...partial,
  };
}

function decision(recordId: string, status: CatalogImportApprovalDecision["status"]): CatalogImportApprovalDecision {
  return {
    recordId,
    jobId: "job-1",
    status,
    actorUserId: "admin-1",
    actorRole: "admin",
    decidedAt: new Date().toISOString(),
    reason: null,
    override: false,
    published: false,
  };
}

function importRow(rowNumber: number): ImportRecord {
  return {
    rowNumber,
    segment: "car",
    fields: {
      brand: "Hyundai",
      model: "Creta",
      variant: "SX",
      fuel: "Petrol",
      transmission: "Manual",
      year: 2024,
      city: "Delhi",
      exShowroomPrice: 1200000,
      source_id: `ext-${rowNumber}`,
    },
  };
}

function mockStorage(): StorageProvider {
  return {
    provider: "cloudflare_r2",
    config: { provider: "cloudflare_r2", bucket: "test" },
    upload: async (req) =>
      storageSuccess({
        key: req.key,
        publicUrl: `https://cdn.example.com/${req.key}`,
        byteLength: req.body.byteLength,
        contentType: req.contentType,
        etag: "etag",
      }),
    download: async () => storageSuccess({ key: "k", body: Buffer.from(""), contentType: "image/jpeg", byteLength: 0, etag: "e" }),
    delete: async () => storageSuccess({ deleted: true }),
    exists: async () => storageSuccess(false),
    getPublicUrl: () => storageSuccess("https://cdn.example.com/x"),
    getSignedUrl: async () => storageSuccess("https://cdn.example.com/x?sig=1"),
  };
}

function mockPrisma(options?: { failOnce?: boolean; existingPublished?: boolean }) {
  let failOnce = options?.failOnce ?? false;
  const variants = new Map<string, { id: string; status: string; metadata: Record<string, unknown>; publishedAt: Date | null }>();

  const tx = {
    catalogDataSource: {
      upsert: async () => ({ id: "src-1", code: "gaadi_bazaar" }),
    },
    catalogVariant: {
      findUnique: async ({ where }: { where: { businessKey?: string } }) => {
        if (!where.businessKey) return null;
        const found = [...variants.values()].find((v) => (v as { businessKey?: string }).businessKey === where.businessKey);
        return found ?? (options?.existingPublished
          ? { id: "v-existing", status: "published", metadata: { lastImportJobId: "job-1" }, publishedAt: new Date(), externalId: "ext-1", sourceUrl: null }
          : null);
      },
      findFirst: async () => null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        if (failOnce) {
          failOnce = false;
          throw new Error("simulated db failure");
        }
        const row = {
          id: `v-${variants.size + 1}`,
          status: "published",
          metadata: data.metadata as Record<string, unknown>,
          publishedAt: new Date(),
          businessKey: data.businessKey as string,
          externalId: data.externalId as string,
          sourceUrl: null,
        };
        variants.set(row.id, row);
        return row;
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = variants.get(where.id) ?? {
          id: where.id,
          status: "published",
          metadata: {},
          publishedAt: new Date(),
        };
        Object.assign(row, data);
        variants.set(where.id, row);
        return row;
      },
    },
    catalogBrand: {
      upsert: async () => ({ id: "b1", slug: "hyundai" }),
    },
    catalogModel: {
      upsert: async () => ({ id: "m1", slug: "creta" }),
    },
    catalogVariantSpec: {
      upsert: async () => ({ id: "spec1" }),
    },
    catalogVariantMedia: {
      findFirst: async () => null,
      create: async () => ({ id: "media1" }),
      update: async () => ({ id: "media1" }),
    },
    catalogVariantColor: {
      findFirst: async () => null,
      create: async () => ({ id: "color1" }),
    },
    catalogVariantFeature: {
      findFirst: async () => null,
      create: async () => ({ id: "feat1" }),
    },
    catalogCity: {
      findUnique: async () => ({ id: "city1", slug: "delhi" }),
      create: async () => ({ id: "city1", slug: "delhi" }),
    },
    catalogVariantCityPrice: {
      findFirst: async () => null,
      create: async () => ({ id: "price1" }),
      update: async () => ({ id: "price1" }),
    },
  };

  return {
    activityLog: {
      create: async () => ({ id: "log1" }),
    },
    $transaction: async (fn: (txClient: typeof tx) => Promise<unknown>) => fn(tx),
  };
}

describe("selectApprovedPublishCandidates", () => {
  it("only includes APPROVED decisions", () => {
    const decisions = new Map([
      ["a", decision("a", "APPROVED")],
      ["b", decision("b", "REJECTED")],
      ["c", decision("c", "PENDING_REVIEW")],
    ]);
    const { candidates, skippedNotApproved } = selectApprovedPublishCandidates({
      previewRecords: [
        previewRow({ id: "a", rowNumber: 1 }),
        previewRow({ id: "b", rowNumber: 2 }),
        previewRow({ id: "c", rowNumber: 3 }),
      ],
      decisions,
      importRecords: [importRow(1), importRow(2), importRow(3)],
    });
    assert.equal(candidates.length, 1);
    assert.equal(skippedNotApproved.length, 2);
    assert.equal(candidates[0]?.recordId, "a");
  });
});

describe("resolveCatalogPublishStorage", () => {
  it("fails closed when storage is not configured", () => {
    const prev = process.env.STORAGE_PROVIDER;
    delete process.env.STORAGE_PROVIDER;
    delete process.env.CATALOG_STORAGE_PROVIDER;
    const result = resolveCatalogPublishStorage();
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "STORAGE_NOT_CONFIGURED");
    if (prev !== undefined) process.env.STORAGE_PROVIDER = prev;
  });

  it("rejects local storage without allowMockStorage", () => {
    process.env.STORAGE_PROVIDER = "local";
    process.env.STORAGE_BUCKET = "x";
    const result = resolveCatalogPublishStorage();
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "STORAGE_LOCAL_FORBIDDEN");
    delete process.env.STORAGE_PROVIDER;
    delete process.env.STORAGE_BUCKET;
  });

  it("accepts injected storage for tests", () => {
    const result = resolveCatalogPublishStorage({ injected: mockStorage() });
    assert.equal(result.ok, true);
  });
});

describe("runCatalogPublishEngine", () => {
  beforeEach(() => {
    clearCatalogPublishLocks();
  });

  it("publishes approved records and skips rejected", async () => {
    const decisions = new Map([
      ["a", decision("a", "APPROVED")],
      ["b", decision("b", "REJECTED")],
    ]);

    const report = await runCatalogPublishEngine(
      {
        jobId: "job-1",
        sourceCode: "gaadi_bazaar",
        actorUserId: "admin-1",
        actorRole: "admin",
        confirm: true,
        previewRecords: [previewRow({ id: "a", rowNumber: 1 }), previewRow({ id: "b", rowNumber: 2 })],
        decisions,
        importRecords: [importRow(1), importRow(2)],
        allowMockStorage: true,
      },
      { prisma: mockPrisma() as never, storage: mockStorage(), allowMockStorage: true },
    );

    assert.equal(report.summary.published, 1);
    assert.equal(report.summary.skippedNotApproved, 1);
    assert.equal(report.published, true);
    assert.equal(report.dryRun, false);
    assert.ok(report.results.some((r) => r.status === "PUBLISHED"));
    assert.ok(report.results.some((r) => r.status === "REJECTED"));
  });

  it("requires explicit confirmation flag", async () => {
    await assert.rejects(
      async () =>
        runCatalogPublishEngine(
          {
            jobId: "job-2",
            sourceCode: "gaadi_bazaar",
            actorUserId: "admin-1",
            actorRole: "admin",
            confirm: false as unknown as true,
            previewRecords: [],
            decisions: new Map(),
            importRecords: [],
            allowMockStorage: true,
          },
          { prisma: mockPrisma() as never, storage: mockStorage(), allowMockStorage: true },
        ),
      /PUBLISH_CONFIRMATION_REQUIRED/,
    );
  });

  it("refuses to publish mock catalog sources even when confirm and storage are set", async () => {
    const prevUrl = process.env.CATALOG_MASTER_SOURCE_URL;
    process.env.CATALOG_MASTER_SOURCE_URL = "http://catalog-master-mock:3099/v1/vehicles";
    try {
      await assert.rejects(
        async () =>
          runCatalogPublishEngine(
            {
              jobId: "job-mock",
              sourceCode: "json_api",
              actorUserId: "admin-1",
              actorRole: "admin",
              confirm: true,
              previewRecords: [previewRow({ id: "a", rowNumber: 1 })],
              decisions: new Map([["a", decision("a", "APPROVED")]]),
              importRecords: [importRow(1)],
              allowMockStorage: true,
            },
            { prisma: mockPrisma() as never, storage: mockStorage(), allowMockStorage: true },
          ),
        (err: unknown) => {
          assert.equal((err as { code?: string }).code, "MOCK_SOURCE_PUBLISH_FORBIDDEN");
          return true;
        },
      );
    } finally {
      if (prevUrl === undefined) delete process.env.CATALOG_MASTER_SOURCE_URL;
      else process.env.CATALOG_MASTER_SOURCE_URL = prevUrl;
    }
  });

  it("is retry-safe under concurrent locks (same promise)", async () => {
    const decisions = new Map([["a", decision("a", "APPROVED")]]);
    const deps = { prisma: mockPrisma() as never, storage: mockStorage(), allowMockStorage: true };
    const input = {
      jobId: "job-concurrent",
      sourceCode: "gaadi_bazaar",
      actorUserId: "admin-1",
      actorRole: "admin",
      confirm: true as const,
      previewRecords: [previewRow({ id: "a", rowNumber: 1 })],
      decisions,
      importRecords: [importRow(1)],
      allowMockStorage: true,
    };

    const [a, b] = await Promise.all([
      runCatalogPublishEngine(input, deps),
      runCatalogPublishEngine(input, deps),
    ]);
    assert.equal(a.jobId, b.jobId);
    assert.equal(a.finishedAt, b.finishedAt);
  });

  it("captures partial failure without stopping other records", async () => {
    const decisions = new Map([
      ["a", decision("a", "APPROVED")],
      ["b", decision("b", "APPROVED")],
    ]);

    const report = await runCatalogPublishEngine(
      {
        jobId: "job-partial",
        sourceCode: "gaadi_bazaar",
        actorUserId: "admin-1",
        actorRole: "admin",
        confirm: true,
        previewRecords: [
          previewRow({ id: "a", rowNumber: 1 }),
          previewRow({ id: "b", rowNumber: 2, brand: "Tata", model: "Nexon", variant: "XZ" }),
        ],
        decisions,
        importRecords: [
          importRow(1),
          {
            ...importRow(2),
            fields: {
              ...importRow(2).fields,
              brand: "Tata",
              model: "Nexon",
              variant: "XZ",
              source_id: "ext-2",
            },
          },
        ],
        allowMockStorage: true,
      },
      { prisma: mockPrisma({ failOnce: true }) as never, storage: mockStorage(), allowMockStorage: true },
    );

    assert.equal(report.summary.failed + report.summary.published, 2);
    assert.ok(report.summary.failed >= 1);
    assert.ok(report.summary.published >= 1);
  });

  it("idempotently skips already-published job rows", async () => {
    const decisions = new Map([["a", decision("a", "APPROVED")]]);
    const report = await runCatalogPublishEngine(
      {
        jobId: "job-1",
        sourceCode: "gaadi_bazaar",
        actorUserId: "admin-1",
        actorRole: "admin",
        confirm: true,
        previewRecords: [previewRow({ id: "a", rowNumber: 1 })],
        decisions,
        importRecords: [importRow(1)],
        allowMockStorage: true,
      },
      { prisma: mockPrisma({ existingPublished: true }) as never, storage: mockStorage(), allowMockStorage: true },
    );

    assert.equal(report.summary.skippedDuplicate, 1);
    assert.equal(report.results[0]?.status, "SKIPPED_DUPLICATE");
  });
});
