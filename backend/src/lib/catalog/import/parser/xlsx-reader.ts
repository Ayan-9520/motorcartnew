import * as XLSX from "xlsx";

export function readXlsxTable(
  content: Buffer | ArrayBuffer | Uint8Array,
  sheetName?: string,
): { headers: string[]; rows: string[][]; sheetName: string } {
  const workbook = XLSX.read(content, { type: "buffer", cellDates: false });
  const targetSheet = sheetName ?? workbook.SheetNames[0];
  if (!targetSheet) {
    return { headers: [], rows: [], sheetName: "" };
  }

  const sheet = workbook.Sheets[targetSheet];
  if (!sheet) {
    return { headers: [], rows: [], sheetName: targetSheet };
  }

  const table = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
  }) as unknown as string[][];

  if (table.length === 0) {
    return { headers: [], rows: [], sheetName: targetSheet };
  }

  const [headers, ...rows] = table;
  return {
    headers: (headers ?? []).map((h) => String(h ?? "")),
    rows: rows.map((row) => (row ?? []).map((cell) => String(cell ?? ""))),
    sheetName: targetSheet,
  };
}
