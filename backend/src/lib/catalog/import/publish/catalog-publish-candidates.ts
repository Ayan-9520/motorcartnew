import type { CatalogImportApprovalDecision } from "../catalog-import-approval.types";
import type { CatalogImportPreviewRecord } from "../catalog-import-preview.types";
import type { ImportRecord } from "../import-types";

export type PublishCandidate = {
  recordId: string;
  preview: CatalogImportPreviewRecord;
  decision: CatalogImportApprovalDecision;
  importRecord: ImportRecord | null;
};

/** Only APPROVED decisions enter the publish queue. */
export function selectApprovedPublishCandidates(options: {
  previewRecords: CatalogImportPreviewRecord[];
  decisions: Map<string, CatalogImportApprovalDecision>;
  importRecords: ImportRecord[];
  recordIds?: string[];
}): { candidates: PublishCandidate[]; skippedNotApproved: PublishCandidate[] } {
  const importByRow = new Map(options.importRecords.map((r) => [r.rowNumber, r]));
  const idFilter = options.recordIds?.length ? new Set(options.recordIds) : null;

  const candidates: PublishCandidate[] = [];
  const skippedNotApproved: PublishCandidate[] = [];

  for (const preview of options.previewRecords) {
    if (idFilter && !idFilter.has(preview.id)) continue;
    const decision = options.decisions.get(preview.id);
    const importRecord = importByRow.get(preview.rowNumber) ?? null;
    const row: PublishCandidate = {
      recordId: preview.id,
      preview,
      decision:
        decision ??
        ({
          recordId: preview.id,
          jobId: "",
          status: "PENDING_REVIEW",
          actorUserId: "",
          actorRole: "",
          decidedAt: "",
          reason: null,
          override: false,
          published: false,
        } as CatalogImportApprovalDecision),
      importRecord,
    };

    if (decision?.status === "APPROVED") {
      candidates.push(row);
    } else {
      skippedNotApproved.push(row);
    }
  }

  return { candidates, skippedNotApproved };
}
