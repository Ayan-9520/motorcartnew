import type { ImportContext } from "../import-context";
import type { ImportParser } from "../import-interfaces";
import { ImportError, importFailure, importSuccess, type ImportRecord, type ImportResult, type ImportUploadPayload } from "../import-types";
import { parseReportToImportRecords, parseSpreadsheet } from "./spreadsheet-parser";
import type { SpreadsheetParseInput } from "./parser-types";

function resolveParseInput(context: ImportContext): SpreadsheetParseInput | null {
  const upload = context.upload;
  if (!upload) return null;

  if (context.sourceType === "csv") {
    const content =
      typeof upload.raw === "string"
        ? upload.raw
        : Buffer.isBuffer(upload.raw)
          ? upload.raw.toString("utf8")
          : String(upload.raw ?? "");
    return { sourceType: "csv", fileName: upload.fileName, content };
  }

  if (context.sourceType === "excel") {
    const raw = upload.raw;
    if (typeof raw === "string") {
      return { sourceType: "excel", fileName: upload.fileName, content: Buffer.from(raw, "binary") };
    }
    if (Buffer.isBuffer(raw) || raw instanceof ArrayBuffer || raw instanceof Uint8Array) {
      return { sourceType: "excel", fileName: upload.fileName, content: raw };
    }
    return null;
  }

  return null;
}

/** Phase 3B catalog spreadsheet parser — CSV & XLSX, read-only. */
export class CatalogSpreadsheetParser implements ImportParser {
  readonly supportedSources = ["csv", "excel"] as const;

  async parse(context: ImportContext): Promise<ImportResult<ImportRecord[]>> {
    const input = resolveParseInput(context);
    if (!input) {
      return importFailure("upload", [
        new ImportError("Unsupported or missing upload payload for spreadsheet parser", "PARSER_INPUT_INVALID", {
          stage: "upload",
          details: { sourceType: context.sourceType },
        }),
      ]);
    }

    try {
      const report = parseSpreadsheet(input);
      const records: ImportRecord[] = parseReportToImportRecords(report);

      return importSuccess("upload", records, {
        warnings: report.warnings,
        metadata: {
          parseReport: {
            validCount: report.validRecords.length,
            invalidCount: report.invalidRecords.length,
            unknownColumns: report.unknownColumns,
            columnMapping: report.columnMapping,
            invalidRecords: report.invalidRecords,
          },
        },
      });
    } catch (error) {
      return importFailure("upload", [
        new ImportError("Spreadsheet parse failed", "PARSER_PARSE_FAILED", {
          stage: "upload",
          cause: error,
        }),
      ]);
    }
  }
}

export function createCatalogSpreadsheetParser(): CatalogSpreadsheetParser {
  return new CatalogSpreadsheetParser();
}

export function parseUploadPayload(payload: ImportUploadPayload): ReturnType<typeof parseSpreadsheet> {
  const sourceType = payload.sourceType === "excel" ? "excel" : "csv";
  if (sourceType === "csv") {
    return parseSpreadsheet({
      sourceType: "csv",
      fileName: payload.fileName,
      content: typeof payload.raw === "string" ? payload.raw : String(payload.raw ?? ""),
    });
  }

  const raw = payload.raw;
  const content =
    Buffer.isBuffer(raw) || raw instanceof Uint8Array
      ? raw
      : typeof raw === "string"
        ? Buffer.from(raw, "binary")
        : Buffer.from([]);

  return parseSpreadsheet({ sourceType: "excel", fileName: payload.fileName, content });
}
