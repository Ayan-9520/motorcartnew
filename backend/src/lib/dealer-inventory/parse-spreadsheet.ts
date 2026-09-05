import { readCsvTable } from "@/lib/catalog/import/parser/csv-reader";
import { readXlsxTable } from "@/lib/catalog/import/parser/xlsx-reader";
import { FORBIDDEN_IMPORT_COLUMNS, IMPORT_HEADER_ALIASES, MAX_BULK_FILE_BYTES, MAX_BULK_ROWS } from "./constants";
import { DealerInventoryError } from "./errors";
import { blankToEmpty } from "./validate";
import * as XLSX from "xlsx";

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export type ParsedInventorySheet = {
  headers: string[];
  mapped: string[];
  rows: Array<{ rowNumber: number; values: Record<string, string> }>;
  warnings: string[];
};

export function parseInventorySpreadsheet(input: {
  filename: string;
  content: Buffer | Uint8Array | string;
}): ParsedInventorySheet {
  const name = input.filename.toLowerCase();
  const buf =
    typeof input.content === "string"
      ? Buffer.from(input.content, "utf8")
      : Buffer.isBuffer(input.content)
        ? input.content
        : Buffer.from(input.content);

  if (buf.byteLength > MAX_BULK_FILE_BYTES) {
    throw new DealerInventoryError("File too large (max 2MB)", 400, "FILE_TOO_LARGE");
  }

  let headers: string[] = [];
  let dataRows: string[][] = [];
  const warnings: string[] = [];

  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    const table = readCsvTable(buf.toString("utf8"));
    headers = table.headers;
    dataRows = table.rows;
  } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const table = readXlsxTable(buf);
    headers = table.headers;
    dataRows = table.rows;
  } else {
    throw new DealerInventoryError("Unsupported format. Use .csv or .xlsx", 400, "UNSUPPORTED_FORMAT");
  }

  if (!headers.length) {
    throw new DealerInventoryError("Missing header row", 400, "MISSING_HEADERS");
  }

  const mapped: string[] = [];
  const indexToField = new Map<number, string>();
  headers.forEach((h, i) => {
    const key = normalizeHeader(h);
    if (FORBIDDEN_IMPORT_COLUMNS.has(key)) {
      warnings.push(`Ignored forbidden column: ${h}`);
      return;
    }
    const field = IMPORT_HEADER_ALIASES[key];
    if (!field) {
      warnings.push(`Ignored unknown column: ${h}`);
      return;
    }
    indexToField.set(i, field);
    if (!mapped.includes(field)) mapped.push(field);
  });

  const missing: string[] = [];
  for (const req of ["brand", "model"] as const) {
    if (!mapped.includes(req)) missing.push(req);
  }
  if (missing.length) {
    throw new DealerInventoryError(
      `Required columns missing: ${missing.join(", ")}. Need Brand and Model.`,
      400,
      "MISSING_REQUIRED_COLUMNS",
    );
  }

  if (dataRows.length > MAX_BULK_ROWS) {
    throw new DealerInventoryError(`Too many rows (max ${MAX_BULK_ROWS})`, 400, "TOO_MANY_ROWS");
  }

  const rows = dataRows
    .map((row, idx) => {
      const values: Record<string, string> = {};
      indexToField.forEach((field, col) => {
        values[field] = blankToEmpty(row[col]);
      });
      // Skip placeholder/trailing rows: need Brand or Model to be a real inventory line.
      // (Bare zeros in KM Driven / Ownership must not keep empty brand/model rows alive.)
      if (!values.brand && !values.model) return null;
      return { rowNumber: idx + 2, values };
    })
    .filter(Boolean) as Array<{ rowNumber: number; values: Record<string, string> }>;

  return { headers, mapped, rows, warnings };
}

/** Canonical demo headers — petrol/diesel + EV in one sheet (real dealer upload shape). */
export const INVENTORY_TEMPLATE_HEADERS = [
  "Brand",
  "Model",
  "Variant",
  "Year",
  "Fuel",
  "Transmission",
  "Body Type",
  "Engine CC",
  "Mileage",
  "Range Km",
  "Battery kWh",
  "Power",
  "Torque",
  "Seating",
  "Boot Space",
  "Ground Clearance",
  "Drive Type",
  "Airbags",
  "Color",
  "Stock",
  "Ex-Showroom Price",
  "On-Road Price",
  "Dealer Price",
  "Waiting Period Days",
  "Main Image URL",
  "Features",
  "Description",
] as const;

export type InventoryTemplateHeader = (typeof INVENTORY_TEMPLATE_HEADERS)[number];

/** Demo rows: ICE + EV — ready to upload as-is (Brand+Model required; rest optional). */
export function inventoryTemplateSampleRows(): Record<InventoryTemplateHeader, string | number>[] {
  const empty = Object.fromEntries(INVENTORY_TEMPLATE_HEADERS.map((h) => [h, ""])) as Record<
    InventoryTemplateHeader,
    string | number
  >;
  return [
    {
      ...empty,
      Brand: "Hyundai",
      Model: "Creta",
      Variant: "SX(O) 1.5 Petrol",
      Year: 2025,
      Fuel: "Petrol",
      Transmission: "IVT",
      "Body Type": "SUV",
      "Engine CC": "1497",
      Mileage: "17.4 kmpl",
      Power: "113 bhp",
      Torque: "144 Nm",
      Seating: "5",
      "Boot Space": "433 litres",
      "Ground Clearance": "190 mm",
      "Drive Type": "FWD",
      Airbags: "6",
      Color: "Atlas White",
      Stock: 2,
      "Ex-Showroom Price": 1485000,
      "On-Road Price": 1663000,
      "Dealer Price": 1450000,
      "Waiting Period Days": 14,
      Features: "Sunroof|Ventilated seats|ADAS Level 2|Wireless Android Auto",
      Description: "Demo ICE — exact ex-showroom + full specs",
    },
    {
      ...empty,
      Brand: "Tata",
      Model: "Nexon EV",
      Variant: "Creative+ 45",
      Year: 2025,
      Fuel: "Electric",
      Transmission: "Automatic",
      "Body Type": "SUV",
      Mileage: "",
      "Range Km": "489 km",
      "Battery kWh": "45",
      Power: "150 bhp",
      Torque: "215 Nm",
      Seating: "5",
      "Boot Space": "350 litres",
      "Ground Clearance": "205 mm",
      "Drive Type": "FWD",
      Airbags: "6",
      Color: "Daytona Grey",
      Stock: 2,
      "Ex-Showroom Price": 1499000,
      "On-Road Price": 1685000,
      "Dealer Price": 1475000,
      "Waiting Period Days": 21,
      Features: "Fast charger|Connected car|Sunroof|Auto park assist",
      Description: "Demo EV — use Range Km + Battery kWh (leave Engine CC blank)",
    },
    {
      ...empty,
      Brand: "MG",
      Model: "Windsor EV",
      Variant: "Essence",
      Year: 2025,
      Fuel: "Electric",
      Transmission: "Automatic",
      "Body Type": "SUV",
      "Range Km": "331 km",
      "Battery kWh": "38",
      Power: "134 bhp",
      Torque: "200 Nm",
      Seating: "5",
      "Boot Space": "604 litres",
      "Ground Clearance": "186 mm",
      "Drive Type": "FWD",
      Airbags: "6",
      Color: "Pearl White",
      Stock: 1,
      "Ex-Showroom Price": 1399000,
      "On-Road Price": "",
      "Dealer Price": 1375000,
      "Waiting Period Days": 28,
      Features: "iSMART|Panoramic glass roof|Vehicle-to-load",
      Description: "Demo EV hatch/SUV crossover — battery + range filled",
    },
    {
      ...empty,
      Brand: "Mahindra",
      Model: "XUV700",
      Variant: "AX7 Diesel AT",
      Year: 2025,
      Fuel: "Diesel",
      Transmission: "Automatic",
      "Body Type": "SUV",
      "Engine CC": "2184",
      Mileage: "17 kmpl",
      Power: "182 bhp",
      Torque: "450 Nm",
      Seating: "7",
      "Boot Space": "540 litres",
      "Ground Clearance": "200 mm",
      "Drive Type": "AWD",
      Airbags: "7",
      Color: "Napoli Black",
      Stock: 1,
      "Ex-Showroom Price": "Rs. 13.99 - 24.50 Lakh",
      Features: "Panoramic sunroof|AdrenoX|360 camera",
      "Waiting Period Days": 21,
      Description: "Demo — price range becomes Price on request (no invented amount)",
    },
    {
      ...empty,
      Brand: "Maruti Suzuki",
      Model: "Fronx",
      Variant: "Alpha",
      Year: 2026,
      Fuel: "Petrol",
      Transmission: "Manual",
      "Body Type": "Crossover",
      "Engine CC": "1197",
      Mileage: "21.79 kmpl",
      Power: "88 bhp",
      Torque: "113 Nm",
      Seating: "5",
      "Boot Space": "308 litres",
      "Ground Clearance": "190 mm",
      "Drive Type": "FWD",
      Airbags: "6",
      Color: "Splendid Silver",
      Stock: 1,
      "Waiting Period Days": 7,
      Features: "Head-up display|Cruise control",
      Description: "Demo — blank price = Price on request; add https image URL when ready",
    },
  ];
}

function csvEscape(v: string | number): string {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function inventoryTemplateCsv(): string {
  const rows = inventoryTemplateSampleRows();
  const header = INVENTORY_TEMPLATE_HEADERS.join(",");
  const lines = rows.map((row) => INVENTORY_TEMPLATE_HEADERS.map((h) => csvEscape(row[h])).join(","));
  return [header, ...lines].join("\n");
}

/** Binary .xlsx demo — same columns/rows as CSV (preferred for dealers). */
export function inventoryTemplateXlsx(): Buffer {
  const rows = inventoryTemplateSampleRows();
  const ws = XLSX.utils.json_to_sheet(rows, { header: [...INVENTORY_TEMPLATE_HEADERS] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "New Cars");
  const guide = XLSX.utils.aoa_to_sheet([
    ["MotorCart new-car inventory demo"],
    ["Required: Brand, Model"],
    ["Optional: all other columns"],
    ["EV: set Fuel=Electric, fill Range Km + Battery kWh, leave Engine CC blank"],
    ["ICE: fill Engine CC + Mileage (kmpl); leave Range/Battery blank"],
    ["Price: exact number or Rs. X Lakh; ranges → Price on request"],
    ["Features: separate with |"],
    ["Upload this sheet on Bulk upload (CSV or XLSX)."],
  ]);
  XLSX.utils.book_append_sheet(wb, guide, "Instructions");
  const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return Buffer.isBuffer(out) ? out : Buffer.from(out as ArrayBuffer);
}
