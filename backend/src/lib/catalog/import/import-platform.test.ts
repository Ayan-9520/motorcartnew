import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ImportContext } from "./import-context";
import type {
  ImportParser,
  ImportPublisher,
  ImportSource,
  ImportValidator,
} from "./import-interfaces";
import { ImportJob } from "./import-job";
import { ImportManager, createImportManager } from "./import-manager";
import { ImportPipeline, createImportPipeline } from "./import-pipeline";
import {
  IMPORT_PIPELINE_STAGES,
  ImportError,
  importFailure,
  importSuccess,
  type ImportRecord,
  type ImportUploadPayload,
} from "./import-types";
import { DEFAULT_CATALOG_IMPORT_SEGMENT } from "./catalog-segment";

function sampleImportRecord(rowNumber: number, fields: Record<string, string | number | boolean | null>): ImportRecord {
  return { rowNumber, segment: DEFAULT_CATALOG_IMPORT_SEGMENT, fields };
}

function mockSource(
  type: ImportSource["type"] = "csv",
  impl?: Partial<ImportSource>,
): ImportSource {
  return {
    type,
    upload: async (ctx) =>
      importSuccess<ImportUploadPayload>("upload", {
        sourceType: type,
        fileName: "sample.csv",
        byteLength: 128,
        raw: "brand,model\nHyundai,Creta",
        receivedAt: new Date().toISOString(),
      }, { metadata: { jobId: ctx.jobId } }),
    ...impl,
  };
}

function mockParser(records: ImportRecord[] = [
  sampleImportRecord(1, {
    brand: "Hyundai",
    model: "Creta",
    variant: "SX",
    fuel: "Diesel",
    transmission: "Automatic",
    year: 2025,
  }),
]): ImportParser {
  return {
    supportedSources: ["csv"],
    parse: async () => importSuccess("upload", records),
  };
}

function mockValidator(valid = true): ImportValidator {
  return {
    validate: async (ctx) =>
      importSuccess("validate", {
        valid,
        recordCount: ctx.records.length,
        issues: valid ? [] : [{ code: "REQUIRED", message: "Missing variant", rowNumber: 1 }],
      }),
  };
}

function mockPublisher(): ImportPublisher {
  return {
    publish: async (ctx) =>
      importSuccess("publish", {
        published: true,
        dryRun: true,
        wouldPublishCount: ctx.normalizedRecords.length,
        message: "mock publish",
      }),
  };
}

describe("ImportError and result helpers", () => {
  it("creates ImportError with code and stage", () => {
    const err = new ImportError("failed", "TEST_FAIL", { stage: "validate", details: { row: 1 } });
    assert.equal(err.name, "ImportError");
    assert.equal(err.code, "TEST_FAIL");
    assert.equal(err.stage, "validate");
  });

  it("builds success and failure results", () => {
    const ok = importSuccess("preview", { count: 1 }, { warnings: ["w"] });
    assert.equal(ok.success, true);
    assert.equal(ok.stage, "preview");

    const fail = importFailure("approve", [new ImportError("x", "X")]);
    assert.equal(fail.success, false);
    assert.equal(fail.errors.length, 1);
  });
});

describe("ImportContext", () => {
  it("tracks stage lifecycle and snapshot", () => {
    const ctx = ImportContext.create({ sourceType: "json" });
    ctx.beginStage("upload");
    ctx.completeStage("upload", true, "ok");
    ctx.setRecords([sampleImportRecord(1, { a: "1" })]);
    ctx.addWarning("note");

    const snap = ctx.snapshot();
    assert.equal(snap.sourceType, "json");
    assert.equal(snap.records.length, 1);
    assert.equal(snap.stageLogs.length, 1);
    assert.equal(snap.warnings.length, 1);
  });
});

describe("ImportPipeline", () => {
  it("runs all stages in order without parser/validator", async () => {
    const pipeline = createImportPipeline({ source: mockSource("csv") });
    const ctx = ImportContext.create({ sourceType: "csv", dryRun: true });
    const result = await pipeline.run(ctx);

    assert.equal(result.success, true);
    assert.deepEqual(result.completedStages, [...IMPORT_PIPELINE_STAGES]);
    assert.equal(ctx.publish?.dryRun, true);
    assert.equal(ctx.publish?.published, false);
    assert.ok(ctx.warnings.some((w) => w.includes("ImportParser") || w.includes("preloaded")));
    assert.equal(ctx.duplicates?.checked, true);
    assert.ok(ctx.media);
    assert.ok(ctx.storage?.dryRun);
  });

  it("uses parser and validator when provided", async () => {
    const pipeline = createImportPipeline({
      source: mockSource("csv"),
      parser: mockParser(),
      validator: mockValidator(true),
    });
    const ctx = ImportContext.create({ sourceType: "csv" });
    const result = await pipeline.run(ctx);

    assert.equal(result.success, true);
    assert.equal(ctx.records.length, 1);
    assert.equal(ctx.validation?.valid, true);
    assert.equal(ctx.normalizedRecords.length, 1);
    assert.equal(ctx.preview?.recordCount, 1);
    assert.equal(ctx.normalizedRecords[0]?.segment, DEFAULT_CATALOG_IMPORT_SEGMENT);
  });

  it("stops on upload failure", async () => {
    const pipeline = createImportPipeline({
      source: mockSource("csv", {
        upload: async () => importFailure("upload", [new ImportError("upload failed", "UPLOAD_FAIL")]),
      }),
    });
    const result = await pipeline.run(ImportContext.create({ sourceType: "csv" }));
    assert.equal(result.success, false);
    assert.equal(result.failedStage, "upload");
    assert.equal(result.completedStages.length, 0);
  });

  it("stops on validation failure", async () => {
    const pipeline = createImportPipeline({
      source: mockSource("csv"),
      parser: mockParser(),
      validator: mockValidator(false),
    });
    const result = await pipeline.run(ImportContext.create({ sourceType: "csv" }));
    assert.equal(result.success, false);
    assert.equal(result.failedStage, "validate");
    assert.equal(result.context.validation?.valid, false);
  });

  it("rejects approve when minRecordsForApproval not met", async () => {
    const pipeline = createImportPipeline(
      { source: mockSource("csv") },
      { minRecordsForApproval: 5 },
    );
    const result = await pipeline.run(ImportContext.create({ sourceType: "csv" }));
    assert.equal(result.success, false);
    assert.equal(result.failedStage, "approve");
    assert.equal(result.context.approval?.decision, "rejected");
  });

  it("requires publisher when dryRun disabled", async () => {
    const pipeline = createImportPipeline(
      { source: mockSource("csv"), parser: mockParser() },
      { dryRun: false, minRecordsForApproval: 0 },
    );
    const ctx = ImportContext.create({ sourceType: "csv", dryRun: false });
    const result = await pipeline.run(ctx);
    assert.equal(result.success, false);
    assert.equal(result.failedStage, "publish");
  });

  it("calls publisher when dryRun disabled and publisher configured", async () => {
    const pipeline = createImportPipeline(
      { source: mockSource("csv"), parser: mockParser(), publisher: mockPublisher() },
      { dryRun: false, minRecordsForApproval: 0 },
    );
    const ctx = ImportContext.create({ sourceType: "csv", dryRun: false });
    const result = await pipeline.run(ctx);
    assert.equal(result.success, true);
    assert.equal(result.context.publish?.message, "mock publish");
  });

  it("fails parse step when parser returns failure", async () => {
    const pipeline = createImportPipeline({
      source: mockSource("csv"),
      parser: {
        supportedSources: ["csv"],
        parse: async () => importFailure("upload", [new ImportError("parse fail", "PARSE_FAIL")]),
      },
    });
    const result = await pipeline.run(ImportContext.create({ sourceType: "csv" }));
    assert.equal(result.success, false);
    assert.equal(result.failedStage, "upload");
  });
});

describe("ImportJob", () => {
  it("creates job and attaches result", () => {
    const job = ImportJob.create({ sourceType: "excel", fileName: "book.xlsx" });
    assert.equal(job.sourceType, "excel");
    assert.equal(job.status, "pending");
    assert.equal(job.result === null, true);

    job.attachResult({
      jobId: job.id,
      success: true,
      completedStages: ["upload"],
      finalStage: "upload",
      context: job.context,
    });
    const attached = job.result;
    assert.equal(attached !== null && attached.success, true);
    assert.ok(job.snapshot().context.jobId);
  });
});

describe("ImportManager", () => {
  it("creates, runs, lists, and retrieves jobs", async () => {
    const manager = createImportManager({
      source: mockSource("json"),
      parser: mockParser([sampleImportRecord(1, { brand: "Tata", model: "Nexon", variant: "XZ+", fuel: "Petrol", transmission: "Manual", year: 2025 })]),
    });

    const job = await manager.runNewJob({ sourceType: "json", initiatedBy: "ops@motorcart.in" }, "job-test-1");
    assert.equal(job.status, "completed");
    assert.equal(manager.getJob("job-test-1")?.id, "job-test-1");
    assert.equal(manager.listJobs().length, 1);
    assert.equal(job.context.approval?.decision, "approved");
  });

  it("throws when running unknown job id", async () => {
    const manager = createImportManager({ source: mockSource() });
    await assert.rejects(() => manager.runJob("missing"), /not found/);
  });

  it("cancels pending/running jobs only", () => {
    const manager = new ImportManager({ source: mockSource() });
    const job = manager.createJob({ sourceType: "api" });
    assert.equal(manager.cancelJob(job.id), true);
    assert.equal(job.status, "cancelled");
    assert.equal(manager.cancelJob(job.id), false);
  });

  it("never writes to database (in-memory only)", async () => {
    const manager = createImportManager({ source: mockSource("oem_feed"), parser: mockParser() });
    const job = await manager.runNewJob({ sourceType: "oem_feed" });
    assert.equal(job.context.publish?.published, false);
    assert.equal(job.context.publish?.dryRun, true);
  });
});

describe("supported source types", () => {
  it("accepts all future source enums", async () => {
    const types = ["csv", "excel", "json", "api", "scraper", "oem_feed"] as const;
    for (const sourceType of types) {
      const pipeline = createImportPipeline({ source: mockSource(sourceType) });
      const result = await pipeline.run(ImportContext.create({ sourceType }));
      assert.equal(result.success, true, `expected success for ${sourceType}`);
    }
  });
});
