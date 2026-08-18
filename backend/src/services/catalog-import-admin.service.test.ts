import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { NextRequest } from "next/server";
import { signAccessToken } from "@/lib/auth/jwt";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { catalogAdminOffResponse, isCatalogAdminEnabled } from "@/lib/catalog/guard";
import {
  CatalogImportAdminService,
  buildStatusResponse,
} from "@/services/catalog-import-admin.service";
import type { CatalogImportJobResult } from "@/lib/catalog/import/catalog-import-job.types";

function authRequest(role: string): NextRequest {
  const token = signAccessToken({ sub: "user-1", role: role as "admin" });
  return new NextRequest("http://localhost/api/admin/catalog/import/start", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
  });
}

describe("requirePlatformAdmin (catalog import RBAC)", () => {
  it("allows admin roles", () => {
    const user = requirePlatformAdmin(authRequest("admin"));
    assert.equal(user.role, "admin");
  });

  it("allows super_admin roles", () => {
    const user = requirePlatformAdmin(authRequest("super_admin"));
    assert.equal(user.role, "super_admin");
  });

  it("rejects unauthenticated requests", () => {
    const req = new NextRequest("http://localhost/api/admin/catalog/import/start");
    assert.throws(() => requirePlatformAdmin(req), /UNAUTHORIZED/);
  });

  it("rejects non-admin roles", () => {
    assert.throws(() => requirePlatformAdmin(authRequest("customer")), /FORBIDDEN/);
    assert.throws(() => requirePlatformAdmin(authRequest("dealer")), /FORBIDDEN/);
  });
});

describe("catalogAdminOffResponse", () => {
  it("returns null when enabled and 404 when disabled", () => {
    const off = catalogAdminOffResponse();
    if (isCatalogAdminEnabled()) {
      assert.equal(off, null);
    } else {
      assert.ok(off);
      assert.equal(off?.status, 404);
    }
  });
});

describe("CatalogImportAdminService", () => {
  let service: CatalogImportAdminService;

  const mockResult: CatalogImportJobResult = {
    jobId: "catalog-import-test",
    success: true,
    input: { source: "gaadi_bazaar", pages: 1 },
    payload: null,
    scrapeErrors: [],
    pipeline: null,
    report: {
      generatedAt: new Date().toISOString(),
      dryRun: true,
      input: { source: "gaadi_bazaar", pages: 1 },
      stages: [
        {
          stage: "gaadi_bazaar_scraper",
          label: "GaadiBazaar Scraper",
          success: true,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: 12,
        },
        {
          stage: "validate",
          label: "Validation",
          success: true,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: 4,
        },
      ],
      scrapeStats: {
        listingPagesVisited: 1,
        vehicleCardsSeen: 2,
        vehiclesExtracted: 2,
        vehiclesFailed: 0,
        retries: 0,
        durationMs: 12,
      },
      importSummary: {
        recordCount: 2,
        normalizedCount: 2,
        duplicateCount: 0,
        matchingExact: 0,
        matchingNoMatch: 0,
        approvalDecision: "approved",
        storageUploads: 2,
        previewCount: 2,
        published: false,
      },
      errorSummary: {
        totalErrors: 0,
        scrapeErrors: 0,
        importErrors: 0,
        byCode: {},
        items: [],
      },
      performance: {
        totalDurationMs: 20,
        playwrightWorkerMs: 1,
        scraperMs: 12,
        importPipelineMs: 7,
        recordsPerSecond: 100,
        vehicleCardsPerSecond: 100,
      },
    },
  };

  beforeEach(() => {
    service = new CatalogImportAdminService({
      runJob: async (input) => ({ ...mockResult, jobId: input.jobId ?? mockResult.jobId }),
    });
    service.clearJobs();
  });

  it("starts a job and returns jobId with started status", () => {
    const started = service.start({
      source: "gaadi_bazaar",
      city: "Delhi",
      search: "maruti",
      pages: 5,
    });

    assert.match(started.jobId, /^catalog-import-/);
    assert.equal(started.status, "started");
  });

  it("completes job asynchronously and exposes status report", async () => {
    const started = service.start({ source: "gaadi_bazaar", pages: 1 });

    await new Promise((resolve) => setTimeout(resolve, 20));

    const status = service.getStatus(started.jobId);
    assert.ok(status);
    assert.equal(status!.status, "completed");
    assert.equal(status!.currentStage, "validate");
    assert.equal(status!.progress.recordsProcessed, 2);
    assert.equal(status!.progress.stagesCompleted, 2);
    assert.equal(status!.dryRun, true);
    assert.equal(status!.timings.length, 2);
  });

  it("returns full execution report when job is complete", async () => {
    const started = service.start({ source: "gaadi_bazaar", pages: 1 });
    await new Promise((resolve) => setTimeout(resolve, 20));

    const report = service.getReport(started.jobId);
    assert.ok(report);
    assert.equal(report!.dryRun, true);
    assert.equal(report!.importSummary.published, false);
  });

  it("returns null for unknown jobs", () => {
    assert.equal(service.getStatus("catalog-import-missing"), null);
    assert.equal(service.getReport("catalog-import-missing"), null);
  });

  it("maps failed jobs with error summary", () => {
    const record = {
      jobId: "catalog-import-failed",
      status: "failed" as const,
      input: { source: "gaadi_bazaar" as const },
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      failureMessage: "Worker init failed",
      approvalDecisions: new Map(),
      approvalAudit: [],
    };

    const status = buildStatusResponse(record);
    assert.equal(status.status, "failed");
    assert.equal(status.errors[0]?.code, "JOB_FAILED");
  });
});
