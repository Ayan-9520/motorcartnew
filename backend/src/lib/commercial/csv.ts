import { createHash } from "node:crypto";
import { readCsvTable } from "@/lib/catalog/import/parser/csv-reader";
import { readXlsxTable } from "@/lib/catalog/import/parser/xlsx-reader";
import { CommercialError } from "./errors";

const REQUIRED = ["period", "bank", "product", "reference", "disbursed_amount", "payout_rate", "gross_payout"] as const;

export type PayoutImportPreviewRow = {
  rowNumber: number;
  period: string;
  bank: string;
  product: string;
  reference: string;
  applicationRef: string;
  disbursedAmount: number | null;
  payoutRate: number | null;
  grossPayout: number | null;
  adjustment: number | null;
  status: string;
  errors: string[];
  fingerprint: string;
};

function num(v: string) {
  const n = Number(String(v).replace(/[%₹,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function hashPayoutFile(content: string) {
  return createHash("sha256").update(content).digest("hex");
}

export function parsePayoutSpreadsheet(content: string): { headers: string[]; rows: PayoutImportPreviewRow[] } {
  const table = readCsvTable(content);
  return fromTable(table.headers, table.rows);
}

export function parsePayoutFile(fileName: string, content: string): { headers: string[]; rows: PayoutImportPreviewRow[] } {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const table = readXlsxTable(Buffer.from(content, "base64"));
    return fromTable(table.headers, table.rows);
  }
  return parsePayoutSpreadsheet(content);
}

function fromTable(rawHeaders: string[], rawRows: string[][]): { headers: string[]; rows: PayoutImportPreviewRow[] } {
  const headers = rawHeaders.map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  for (const req of REQUIRED) {
    if (!headers.includes(req)) throw new CommercialError(`Missing header: ${req}`, 400, "IMPORT_HEADERS");
  }
  const idx = (name: string) => headers.indexOf(name);
  const rows: PayoutImportPreviewRow[] = rawRows.map((cells, i) => {
    const get = (name: string) => String(cells[idx(name)] ?? "").trim();
    const errors: string[] = [];
    const period = get("period");
    const bank = get("bank");
    const product = get("product");
    const reference = get("reference");
    const disbursedAmount = num(get("disbursed_amount"));
    const payoutRate = num(get("payout_rate"));
    const grossPayout = num(get("gross_payout"));
    const adjustment = get("adjustment") ? num(get("adjustment")) : 0;
    if (!period) errors.push("period required");
    if (!bank) errors.push("bank required");
    if (!product) errors.push("product required");
    if (!reference) errors.push("reference required");
    if (disbursedAmount == null || disbursedAmount < 0) errors.push("invalid disbursed_amount");
    if (payoutRate == null) errors.push("invalid payout_rate");
    if (grossPayout == null || grossPayout < 0) errors.push("invalid gross_payout");
    const fingerprint = createHash("sha256")
      .update(`${period}|${bank}|${product}|${reference}|${grossPayout}`)
      .digest("hex")
      .slice(0, 64);
    return {
      rowNumber: i + 2,
      period,
      bank,
      product,
      reference,
      applicationRef: get("application_id") || get("application_ref"),
      disbursedAmount,
      payoutRate,
      grossPayout,
      adjustment,
      status: get("status") || "imported",
      errors,
      fingerprint,
    };
  });
  return { headers, rows };
}
