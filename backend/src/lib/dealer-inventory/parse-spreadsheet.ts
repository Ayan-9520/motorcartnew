import { readCsvTable } from "@/lib/catalog/import/parser/csv-reader";
import { FORBIDDEN_IMPORT_COLUMNS, IMPORT_HEADER_ALIASES, MAX_BULK_FILE_BYTES, MAX_BULK_ROWS } from "./constants";
import { DealerInventoryError } from "./errors";
import { blankToEmpty } from "./validate";
import * as XLSX from "xlsx";

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/[()[\]{}]/g, "")
    .replace(/[\u00a0]/g, " ")
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
  if (key === "series" || key === "carline" || key === "nameplate" || key === "line") return "model";
  if (key.includes("variant") || key.includes("trim") || key.includes("grade") || key.includes("derivative")) {
    return "variant";
  }
  if (
    key === "vehicle" ||
    key === "car" ||
    key === "vehicle_name" ||
    key === "vehicle_description" ||
    key === "description_of_vehicle"
  ) {
    return "vehicle_name";
  }
  if (key.includes("ex_showroom") || key.includes("exshowroom")) return "ex_showroom_price";
  if (key.includes("on_road") || key.includes("onroad")) return "on_road_price";
  if (key.includes("dealer_price") || key.includes("offer_price")) return "dealer_price";
  if (key === "price" || key.endsWith("_price") || key.includes("mrp")) return "price";
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

const MULTI_WORD_BRANDS = [
  "aston martin",
  "land rover",
  "range rover",
  "rolls royce",
  "alfa romeo",
  "mercedes benz",
  "mercedes-benz",
  "maruti suzuki",
  "royal enfield",
  "force motors",
  "ashok leyland",
  "great wall",
];

const GENERIC_FILENAME_BRANDS = new Set([
  "inventory",
  "stock",
  "upload",
  "bulk",
  "demo",
  "template",
  "motorcart",
  "new car",
  "new cars",
  "price list",
  "pricelist",
  "sheet",
  "data",
  "file",
  "cars",
  "vehicles",
]);

/** "Aston martin.xlsx" / "Volvo_XC60_stock.csv" → brand hint when sheet has no Brand column. */
export function brandFromFilename(filename: string): string {
  const base = filename.replace(/^.*[\\/]/, "").replace(/\.(xlsx|xls|csv|txt)$/i, "");
  const cleaned = base
    .replace(/[_\-.]+/g, " ")
    .replace(
      /\b(price|list|stock|inventory|upload|bulk|demo|template|new|cars?|vehicles?|dealer|real|sample|fixture|data|file|sheet)\b/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || GENERIC_FILENAME_BRANDS.has(cleaned.toLowerCase())) return "";
  if (cleaned.split(" ").length > 4) return "";
  if (/^\d+$/.test(cleaned)) return "";
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function splitVehicleName(raw: string, fallbackBrand = ""): { brand: string; model: string } {
  const s = blankToEmpty(raw).replace(/\s+/g, " ");
  if (!s) return { brand: fallbackBrand, model: "" };
  const lower = s.toLowerCase();
  for (const b of MULTI_WORD_BRANDS) {
    if (lower === b) return { brand: titleCase(b), model: "" };
    if (lower.startsWith(`${b} `)) {
      return { brand: titleCase(b), model: s.slice(b.length).trim() };
    }
  }
  if (fallbackBrand) {
    const fb = fallbackBrand.toLowerCase();
    if (lower.startsWith(`${fb} `)) {
      return { brand: fallbackBrand, model: s.slice(fallbackBrand.length).trim() };
    }
    return { brand: fallbackBrand, model: s };
  }
  const parts = s.split(" ");
  if (parts.length === 1) return { brand: fallbackBrand || parts[0]!, model: fallbackBrand ? parts[0]! : "" };
  return { brand: parts[0]!, model: parts.slice(1).join(" ") };
}

function titleCase(s: string): string {
  return s
    .split(/[\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(s.includes("-") ? "-" : " ");
}

function sheetToMatrix(sheet: XLSX.WorkSheet): string[][] {
  const table = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  }) as unknown as string[][];
  return (table ?? []).map((row) => (row ?? []).map((cell) => String(cell ?? "")));
}

function scoreHeaderCandidate(
  headers: string[],
  sampleRows: string[][],
): { score: number; mapped: string[]; indexToField: Map<number, string>; warnings: string[] } {
  const mappedInfo = mapHeaders(headers);
  const hasBrand = mappedInfo.mapped.includes("brand");
  const hasModel = mappedInfo.mapped.includes("model");
  const hasVehicle = mappedInfo.mapped.includes("vehicle_name");
  let score =
    (hasBrand ? 4 : 0) + (hasModel ? 4 : 0) + (hasVehicle ? 3 : 0) + mappedInfo.mapped.length * 0.05;

  let filled = 0;
  for (const row of sampleRows.slice(0, 12)) {
    const values: Record<string, string> = {};
    mappedInfo.indexToField.forEach((field, col) => {
      values[field] = blankToEmpty(row[col]);
    });
    if (values.brand || values.model || values.vehicle_name) filled += 1;
  }
  score += Math.min(filled, 8) * 0.5;
  return { score, ...mappedInfo };
}

function pickBestTableFromMatrix(matrix: string[][]): {
  headers: string[];
  rows: string[][];
  mapped: string[];
  indexToField: Map<number, string>;
  sheetWarnings: string[];
  headerRowIndex: number;
  score: number;
} | null {
  if (!matrix.length) return null;
  let best: {
    headers: string[];
    rows: string[][];
    mapped: string[];
    indexToField: Map<number, string>;
    sheetWarnings: string[];
    headerRowIndex: number;
    score: number;
  } | null = null;

  const scanLimit = Math.min(40, matrix.length);
  for (let i = 0; i < scanLimit; i++) {
    const headers = matrix[i] ?? [];
    if (!headers.some((h) => blankToEmpty(h))) continue;
    const dataRows = matrix.slice(i + 1);
    const scored = scoreHeaderCandidate(headers, dataRows);
    if (!scored.mapped.length) continue;
    if (!best || scored.score > best.score) {
      best = {
        headers,
        rows: dataRows,
        mapped: scored.mapped,
        indexToField: scored.indexToField,
        sheetWarnings: scored.warnings,
        headerRowIndex: i,
        score: scored.score,
      };
    }
    if (scored.mapped.includes("brand") && scored.mapped.includes("model") && scored.score >= 8.5) {
      break;
    }
  }
  return best;
}

function enrichRowValues(values: Record<string, string>, fallbackBrand: string): Record<string, string> {
  const next = { ...values };
  if ((!next.brand || !next.model) && next.vehicle_name) {
    const split = splitVehicleName(next.vehicle_name, next.brand || fallbackBrand);
    if (!next.brand) next.brand = split.brand;
    if (!next.model) next.model = split.model;
  }
  if (!next.brand && fallbackBrand) next.brand = fallbackBrand;
  if (next.brand && next.model) {
    const lowerModel = next.model.toLowerCase();
    const lowerBrand = next.brand.toLowerCase();
    if (lowerModel.startsWith(`${lowerBrand} `)) {
      next.model = next.model.slice(next.brand.length).trim();
    }
  } else if (!next.brand && next.model) {
    const split = splitVehicleName(next.model, fallbackBrand);
    if (split.brand && split.model) {
      next.brand = split.brand;
      next.model = split.model;
    } else if (fallbackBrand) {
      next.brand = fallbackBrand;
    }
  }
  return next;
}

function rowsFromTable(
  dataRows: string[][],
  indexToField: Map<number, string>,
  headerRowIndex: number,
  fallbackBrand: string,
): Array<{ rowNumber: number; values: Record<string, string> }> {
  return dataRows
    .map((row, idx) => {
      const values: Record<string, string> = {};
      indexToField.forEach((field, col) => {
        values[field] = blankToEmpty(row[col]);
      });
      const enriched = enrichRowValues(values, fallbackBrand);
      if (!enriched.brand && !enriched.model) return null;
      // Skip leftover title/section rows that only repeated the brand
      if (enriched.brand && !enriched.model && !enriched.variant) return null;
      return { rowNumber: headerRowIndex + idx + 2, values: enriched };
    })
    .filter(Boolean) as Array<{ rowNumber: number; values: Record<string, string> }>;
}

function assertRequiredColumns(mapped: string[], headers: string[], fallbackBrand: string): void {
  const hasBrand = mapped.includes("brand");
  const hasModel = mapped.includes("model");
  const hasVehicle = mapped.includes("vehicle_name");
  const missing: string[] = [];
  if (!hasBrand && !fallbackBrand && !hasVehicle) missing.push("Brand (or Make)");
  if (!hasModel && !hasVehicle) missing.push("Model");
  if (missing.length) {
    const found = headers.filter((h) => blankToEmpty(h)).slice(0, 20).join(", ");
    throw new DealerInventoryError(
      `Required columns missing: ${missing.join(" and ")}. Need Brand (or Make) and Model — or put the brand in the file name (e.g. Aston Martin.xlsx) with a Model column. Found headers: ${found || "(none)"}.`,
      400,
      "MISSING_REQUIRED_COLUMNS",
    );
  }
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

  const fallbackBrand = brandFromFilename(input.filename);
  const warnings: string[] = [];
  if (fallbackBrand) {
    warnings.push(`Using brand hint from file name: ${fallbackBrand}`);
  }

  let headers: string[] = [];
  let dataRows: string[][] = [];
  let mapped: string[] = [];
  let indexToField = new Map<number, string>();
  let headerRowIndex = 0;

  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    const table = readCsvTable(buf.toString("utf8"));
    const matrix = [table.headers, ...table.rows];
    const best = pickBestTableFromMatrix(matrix);
    if (!best) {
      throw new DealerInventoryError("Missing header row", 400, "MISSING_HEADERS");
    }
    headers = best.headers;
    dataRows = best.rows;
    mapped = best.mapped;
    indexToField = best.indexToField;
    headerRowIndex = best.headerRowIndex;
    warnings.push(...best.sheetWarnings);
    if (best.headerRowIndex > 0) {
      warnings.push(`Detected header row ${best.headerRowIndex + 1} (skipped title rows above).`);
    }
  } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const workbook = XLSX.read(buf, { type: "buffer", cellDates: false });
    let best: (ReturnType<typeof pickBestTableFromMatrix> & { sheetName: string }) | null = null;

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;
      const matrix = sheetToMatrix(sheet);
      const candidate = pickBestTableFromMatrix(matrix);
      if (!candidate) continue;
      if (!best || candidate.score > best.score) {
        best = { ...candidate, sheetName };
      }
      if (candidate.mapped.includes("brand") && candidate.mapped.includes("model") && candidate.score >= 8.5) {
        warnings.push(`Using sheet "${sheetName}" for import.`);
        break;
      }
    }

    if (!best) {
      throw new DealerInventoryError(
        "Could not find a header row with Brand/Model (or Vehicle) columns. Download Demo Excel and match those column names.",
        400,
        "MISSING_HEADERS",
      );
    }
    headers = best.headers;
    dataRows = best.rows;
    mapped = best.mapped;
    indexToField = best.indexToField;
    headerRowIndex = best.headerRowIndex;
    warnings.push(...best.sheetWarnings);
    warnings.push(`Using sheet "${best.sheetName}" (header row ${best.headerRowIndex + 1}).`);
  } else {
    throw new DealerInventoryError("Unsupported format. Use .csv or .xlsx", 400, "UNSUPPORTED_FORMAT");
  }

  assertRequiredColumns(mapped, headers, fallbackBrand);

  if (dataRows.length > MAX_BULK_ROWS) {
    throw new DealerInventoryError(`Too many rows (max ${MAX_BULK_ROWS})`, 400, "TOO_MANY_ROWS");
  }

  const rows = rowsFromTable(dataRows, indexToField, headerRowIndex, fallbackBrand);
  if (!rows.length) {
    throw new DealerInventoryError(
      "No data rows found under the header. Add Brand + Model on each row (or Model only if the file name is the brand, e.g. Aston Martin.xlsx).",
      400,
      "NO_DATA_ROWS",
    );
  }

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
