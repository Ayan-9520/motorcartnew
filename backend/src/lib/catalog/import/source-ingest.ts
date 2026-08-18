import type { SourceAdapter } from "./sources/source-adapter";
import { createAdapterImportBridge } from "./adapter-import-bridge";
import type { ImportContext } from "./import-context";
import { gaadiBazaarPayloadToImportRecords } from "./sources/gaadi-bazaar/gaadi-bazaar-mapper";
import { getGaadiBazaarPayload } from "./sources/gaadi-bazaar/gaadi-bazaar.adapter";
import type { ImportUploadPayload } from "./import-types";
import { ImportError, importFailure, importSuccess } from "./import-types";

export type SourceIngestResult = {
  success: boolean;
  recordCount: number;
  message?: string;
};

/** Ingest-only adapter path: connect → fetch → map raw records → disconnect. */
export async function ingestFromSourceAdapter(
  context: ImportContext,
  adapter: SourceAdapter,
): Promise<SourceIngestResult> {
  const bridge = createAdapterImportBridge(context, adapter.sourceId);
  const adapterContext = bridge.adapterContext;

  const connect = await adapter.connect(adapterContext);
  if (!connect.success) {
    bridge.syncAdapterToImport();
    return { success: false, recordCount: 0, message: connect.error.message };
  }

  const fetch = await adapter.fetch(adapterContext);
  if (!fetch.success) {
    bridge.syncAdapterToImport();
    return { success: false, recordCount: 0, message: fetch.error.message };
  }

  let records = adapterContext.records;
  if (adapter.sourceId === "gaadi_bazaar") {
    const payload = getGaadiBazaarPayload(adapterContext);
    if (payload) {
      records = gaadiBazaarPayloadToImportRecords(payload);
      adapterContext.setNormalized({ recordCount: records.length, records });
    }
  }

  await adapter.disconnect(adapterContext);
  bridge.syncAdapterToImport();

  const upload: ImportUploadPayload = {
    sourceType: context.sourceType,
    raw: fetch.data?.raw ?? null,
    byteLength: fetch.data?.byteLength,
    receivedAt: fetch.data?.fetchedAt ?? new Date().toISOString(),
    fileName: `${adapter.sourceId}-ingest`,
  };
  context.setUpload(upload);
  context.setRecords(records);

  return { success: true, recordCount: records.length };
}

export async function ingestSourceAdapterUpload(context: ImportContext, adapter: SourceAdapter) {
  const ingest = await ingestFromSourceAdapter(context, adapter);
  if (!ingest.success) {
    return importFailure("upload", [
      new ImportError(ingest.message ?? "Source ingest failed", "INGEST_FAILED", { stage: "upload" }),
    ]);
  }
  return importSuccess("upload", context.upload, {
    metadata: { recordCount: ingest.recordCount, ingestSuccess: true },
  });
}
