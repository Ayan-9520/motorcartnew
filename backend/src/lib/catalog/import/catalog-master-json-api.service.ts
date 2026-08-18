import { randomUUID } from "node:crypto";
import { runCatalogImport } from "./catalog-import.service";
import type { ImportPipelineRunResult } from "./import-pipeline";
import { JsonApiSourceAdapter } from "./sources/json-api/json-api.adapter";
import type { CatalogMasterFetchImpl } from "./sources/json-api/json-api.adapter";
import type { CatalogVariantRecord } from "../types";

export type CatalogMasterJsonApiDryRunInput = {
  jobId?: string;
  segment?: string;
  initiatedBy?: string;
  /** Test-only overrides — never hardcode production URLs in callers. */
  sourceUrl?: string;
  apiKey?: string | null;
  fetchImpl?: CatalogMasterFetchImpl;
  catalogVariants?: CatalogVariantRecord[];
  skipMatching?: boolean;
};

export type CatalogMasterJsonApiDryRunResult = {
  jobId: string;
  success: boolean;
  dryRun: true;
  databaseWrites: 0;
  published: false;
  pipeline: ImportPipelineRunResult;
  summary: {
    recordCount: number;
    normalizedCount: number;
    validationAccepted: number;
    validationRejected: number;
    duplicateCount: number;
    previewCount: number;
    matchingExact: number;
    matchingNoMatch: number;
    publishWouldPublishCount: number;
    message: string;
  };
};

/**
 * Catalog master JSON API dry-run.
 * fetch → ingestFromSourceAdapter → existing pipeline.
 * NEVER writes catalog data to the database.
 */
export async function runCatalogMasterJsonApiDryRun(
  input: CatalogMasterJsonApiDryRunInput = {},
): Promise<CatalogMasterJsonApiDryRunResult> {
  const jobId = input.jobId ?? `catalog-master-json-api-${randomUUID()}`;

  const pipeline = await runCatalogImport({
    jobId,
    sourceType: "api",
    dryRun: true,
    initiatedBy: input.initiatedBy ?? "catalog-master-json-api-dry-run",
    skipSourceUpload: true,
    sourceAdapter: new JsonApiSourceAdapter(),
    catalogVariants: input.skipMatching ? undefined : input.catalogVariants,
    metadata: {
      catalogMaster: true,
      payloadSegment: input.segment,
      skipMedia: true,
      skipMatching: input.skipMatching === true,
      config: {
        source: "json_api",
        sourceUrl: input.sourceUrl,
        apiKey: input.apiKey,
        fetchImpl: input.fetchImpl,
      },
    },
    pipelineConfig: {
      dryRun: true,
    },
  });

  const ctx = pipeline.context;
  const matching = ctx.matching;
  const duplicates = ctx.duplicates;
  const publish = ctx.publish;
  const catalogValidation = ctx.metadata.catalogValidationReport as
    | { validRecords?: unknown[]; rejectedRecords?: unknown[] }
    | undefined;

  return {
    jobId,
    success: pipeline.success,
    dryRun: true,
    databaseWrites: 0,
    published: false,
    pipeline,
    summary: {
      recordCount: ctx.records.length,
      normalizedCount: ctx.normalizedRecords.length,
      validationAccepted: catalogValidation?.validRecords?.length ?? 0,
      validationRejected: catalogValidation?.rejectedRecords?.length ?? ctx.validation?.issues.length ?? 0,
      duplicateCount: duplicates?.duplicateCount ?? 0,
      previewCount: ctx.preview?.recordCount ?? 0,
      matchingExact: matching?.exactMatches ?? 0,
      matchingNoMatch: matching?.noMatches ?? 0,
      publishWouldPublishCount: publish?.wouldPublishCount ?? 0,
      message:
        publish?.message ??
        "Dry-run catalog master import — no database writes; Hyundai Creta preserved",
    },
  };
}
