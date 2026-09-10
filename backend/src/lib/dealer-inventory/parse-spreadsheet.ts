import { readCsvTable } from "@/lib/catalog/import/parser/csv-reader";
import { readXlsxTable } from "@/lib/catalog/import/parser/xlsx-reader";
import { FORBIDDEN_IMPORT_COLUMNS, IMPORT_HEADER_ALIASES, MAX_BULK_FILE_BYTES, MAX_BULK_ROWS } from "./constants";
import { DealerInventoryError } from "./errors";
import { blankToEmpty } from "./validate";
import * as XLSX from "xlsx";

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/[()[\]{}]/g, "")
    .replace(/[\s./\\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/** Exact alias first, then fuzzy contains for OEM sheets with odd headers. */
function resolveFieldFromHeader(rawHeader: string): string | null {
  const key = normalizeHeader(rawHeader);
  if (!key || FORBIDDEN_IMPORT_COLUMNS.has(key)) return null;
  if (IMPORT_HEADER_ALIASES[key]) return IMPORT_HEADER_ALIASES[key];

  // Fuzzy: "Vehicle Brand Name" → brand, "Model / Series" → model
  if (/(^|_)brand($|_)/.test(key) || key === "make" || key.endsWith("_make") || key.includes("manufacturer")) {
    return "brand";
  }
  if (/(^|_)model($|_)/.test(key) && !key.includes("year")) return "model";
  if (key.includes("variant") || key.includes("trim") || key.includes("grade")) return "variant";
  if (key.includes("ex_showroom") || key.includes("exshowroom")) return "ex_showroom_price";
  if (key.includes("on_road") || key.includes("onroad")) return "on_road_price";
  if (key.includes("dealer_price") || key.includes("offer_price")) return "dealer_price";
  if (key === "price" || key.endsWith("_price")) return "price";
  if (key.includes("pincode") || key.includes("pin_code") || key === "pin") return "pincode";
  if (key.includes("fuel")) return "fuel_type";
  if (key.includes("transmission") || key.includes("gearbox")) return "transmission";
  if (key.includes("colour") || key.includes("color")) return "colour";
  if (key.includes("stock") && key.includes("status")) return "stock_status";
  if (key === "qty" || key === "quantity" || key === "units" || key === "stock") return "stock";
  if (key.includes("year") && !key.includes("warranty")) return "year";
  return null;
}

function mapHeaders(headers: string[]): {
  mapped: string[];
  indexToField: Map<number, string>;
  warnings: string[];
} {
  const mapped: string[] = [];
  const indexToField = new Map<number, string>();
  const warnings: string[] = [];
  const usedFields = new Set<string>();

  headers.forEach((h, i) => {
    const key = normalizeHeader(h);
    if (!key) return;
    if (FORBIDDEN_IMPORT_COLUMNS.has(key)) {
      warnings.push(`Ignored forbidden column: ${h}`);
      return;
    }
    const field = resolveFieldFromHeader(h);
    if (!field) {
      warnings.push(`Ignored unknown column: ${h}`);
      return;
    }
    // First matching column wins for a field (avoid duplicate Brand columns overwriting)
    if (usedFields.has(field)) {
      warnings.push(`Duplicate column for ${field} ignored: ${h}`);
      return;
    }
    usedFields.add(field);
    indexToField.set(i, field);
    mapped.push(field);
  });

  return { mapped, indexToField, warnings };
}

function rowsFromTable(
  headers: string[],
  dataRows: string[][],
  indexToField: Map<number, string>,
): Array<{ rowNumber: number; values: Record<string, string> }> {
  return dataRows
    .map((row, idx) => {
      const values: Record<string, string> = {};
      indexToField.forEach((field, col) => {
        values[field] = blankToEmpty(row[col]);
      });
      if (!values.brand && !values.model) return null;
      return { rowNumber: idx + 2, values };
    })
    .filter(Boolean) as Array<{ rowNumber: number; values: Record<string, string> }>;
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
    throw new DealerInventoryError("File too large (max 12MB)", 400, "FILE_TOO_LARGE");
  }

  let headers: string[] = [];
  let dataRows: string[][] = [];
  const warnings: string[] = [];

  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    const table = readCsvTable(buf.toString("utf8"));
    headers = table.headers;
    dataRows = table.rows;
  } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    // Prefer the sheet that actually has Brand + Model (skip Instructions / cover sheets)
    const workbook = XLSX.read(buf, { type: "buffer", cellDates: false });
    let best:
      | {
          headers: string[];
          rows: string[][];
          mapped: string[];
          indexToField: Map<number, string>;
          sheetWarnings: string[];
          score: number;
        }
      | null = null;

    for (const sheetName of workbook.SheetNames) {
      const table = readXlsxTable(buf, sheetName);
      if (!table.headers.length) continue;
      const mappedInfo = mapHeaders(table.headers);
      const hasBrand = mappedInfo.mapped.includes("brand");
      const hasModel = mappedInfo.mapped.includes("model");
      const score = (hasBrand ? 2 : 0) + (hasModel ? 2 : 0) + mappedInfo.mapped.length * 0.01;
      if (!best || score > best.score) {
        best = {
          headers: table.headers,
          rows: table.rows,
          mapped: mappedInfo.mapped,
          indexToField: mappedInfo.indexToField,
          sheetWarnings: mappedInfo.warnings,
          score,
        };
      }
      if (hasBrand && hasModel) {
        warnings.push(`Using sheet "${sheetName}" for import.`);
        break;
      }
    }

    if (!best) {
      throw new DealerInventoryError("Missing header row", 400, "MISSING_HEADERS");
    }
    headers = best.headers;
    dataRows = best.rows;
    warnings.push(...best.sheetWarnings);

    const missing: string[] = [];
    if (!best.mapped.includes("brand")) missing.push("Brand");
    if (!best.mapped.includes("model")) missing.push("Model");
    if (missing.length) {
      const found = headers.filter((h) => blankToEmpty(h)).slice(0, 20).join(", ");
      throw new DealerInventoryError(
        `Required columns missing: ${missing.join(" and ")}. Need columns named Brand (or Make) and Model. Found headers: ${found || "(none)"}. Other columns are optional — leave blank if missing.`,
        400,
        "MISSING_REQUIRED_COLUMNS",
      );
    }

    if (dataRows.length > MAX_BULK_ROWS) {
      throw new DealerInventoryError(`Too many rows (max ${MAX_BULK_ROWS})`, 400, "TOO_MANY_ROWS");
    }

    const rows = rowsFromTable(headers, dataRows, best.indexToField);
    return { headers, mapped: best.mapped, rows, warnings };
  } else {
    throw new DealerInventoryError("Unsupported format. Use .csv or .xlsx", 400, "UNSUPPORTED_FORMAT");
  }

  if (!headers.length) {
    throw new DealerInventoryError("Missing header row", 400, "MISSING_HEADERS");
  }

  const mappedInfo = mapHeaders(headers);
  warnings.push(...mappedInfo.warnings);

  const missing: string[] = [];
  if (!mappedInfo.mapped.includes("brand")) missing.push("Brand");
  if (!mappedInfo.mapped.includes("model")) missing.push("Model");
  if (missing.length) {
    const found = headers.filter((h) => blankToEmpty(h)).slice(0, 20).join(", ");
    throw new DealerInventoryError(
      `Required columns missing: ${missing.join(" and ")}. Need columns named Brand (or Make) and Model. Found headers: ${found || "(none)"}. Other columns are optional — leave blank if missing.`,
      400,
      "MISSING_REQUIRED_COLUMNS",
    );
  }

  if (dataRows.length > MAX_BULK_ROWS) {
    throw new DealerInventoryError(`Too many rows (max ${MAX_BULK_ROWS})`, 400, "TOO_MANY_ROWS");
  }

  const rows = rowsFromTable(headers, dataRows, mappedInfo.indexToField);
  return { headers, mapped: mappedInfo.mapped, rows, warnings };
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
    ["Optional: all other columns — leave blank if you do not have the data"],
    ["Bad rows are skipped; good rows still import"],
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
