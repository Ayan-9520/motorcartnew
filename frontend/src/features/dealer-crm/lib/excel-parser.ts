import * as XLSX from "xlsx";
import { z } from "zod";
import { COLUMN_ALIASES, INVENTORY_COLUMNS, SAMPLE_ROWS, type InventoryColumn } from "./inventory-columns";
import type { ParsedInventoryRow, RowValidationError } from "../types";

/** Soft schema: Brand + Model mandatory; everything else optional with defaults. */
const rowSchema = z.object({
  brand: z.string().min(1, "Brand is required"),
  model: z.string().min(1, "Model is required"),
  variant: z.string().optional(),
  year: z.number().int().min(1990).max(new Date().getFullYear() + 2),
  fuel: z.string(),
  transmission: z.string(),
  kmsDriven: z.number().min(0),
  ownership: z.number().int().min(0).max(10),
  price: z.number().min(0),
  color: z.string().optional(),
  registrationState: z.string().optional(),
  description: z.string().optional(),
  dealerPrice: z.number().min(0).optional(),
  discount: z.number().min(0).max(100).optional(),
  mainImageUrl: z.string().optional().or(z.literal("")),
  priceOnRequest: z.boolean().optional(),
  priceSourceText: z.string().optional(),
});

function blankToEmpty(v: unknown): string {
  if (v == null) return "";
  const s = String(v)
    .replace(/\u00a0/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
  if (!s) return "";
  const lower = s.toLowerCase();
  if (lower === "undefined" || lower === "null" || lower === "nan" || lower === "n/a" || lower === "na" || lower === "-" || lower === "invalid date") {
    return "";
  }
  return s;
}

function normalizeHeader(h: string): InventoryColumn | null {
  const key = h.trim().toLowerCase().replace(/[\s-]+/g, " ");
  return COLUMN_ALIASES[key] ?? (INVENTORY_COLUMNS.includes(h.trim() as InventoryColumn) ? (h.trim() as InventoryColumn) : null);
}

function parseNumber(val: unknown): number | undefined {
  const s = blankToEmpty(val);
  if (!s) return undefined;
  const n = Number(s.replace(/[,₹\s]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

/** Collect up to 4 image URLs (https or site /uploads|/media paths). Splits on | ; or newlines. */
function collectImageUrls(...cells: unknown[]): string[] {
  const out: string[] = [];
  for (const cell of cells) {
    const raw = blankToEmpty(cell);
    if (!raw) continue;
    const parts = raw.split(/[|;,\n]+/).map((p) => p.trim()).filter(Boolean);
    for (const p of parts) {
      const ok =
        /^https?:\/\//i.test(p) ||
        /^\/uploads\//i.test(p) ||
        /^\/media\//i.test(p);
      if (ok && !out.includes(p)) out.push(p);
    }
  }
  return out.slice(0, 4);
}

/**
 * Parse dealer price cells:
 * - Exact number → amount
 * - Single "Rs. 13.69 Lakh" → 1369000
 * - Range "Rs. 5.70 - 10.67 Lakh" → starting (min) amount; full text kept in sourceText
 */
export function parseDealerPriceText(raw: unknown): {
  amount: number | null;
  sourceText: string | null;
  range: boolean;
  warning?: string;
} {
  const s = blankToEmpty(raw);
  if (!s) return { amount: null, sourceText: null, range: false };

  const compact = s.replace(/,/g, "").replace(/\s+/g, " ").trim().replace(/\*+$/g, "").trim();
  const pure = compact.replace(/^(rs\.?|inr|₹)\s*/i, "");
  if (/^\d+(\.\d+)?$/.test(pure)) {
    const n = Number(pure);
    if (Number.isFinite(n) && n >= 0) return { amount: Math.round(n), sourceText: s, range: false };
  }

  const hasRangeSep = /[-–—]|(\bto\b)/i.test(compact);
  const lakhMatches = [...compact.matchAll(/(\d+(?:\.\d+)?)\s*lakh/gi)];
  const croreMatches = [...compact.matchAll(/(\d+(?:\.\d+)?)\s*cr(?:ore)?/gi)];

  // "5.70 - 10.67 Lakh" (unit only once at end) → use starting (min) price
  const lakhRangeOnce = compact.match(
    /(\d+(?:\.\d+)?)\s*[-–—](?:\s*to\s*)?\s*(\d+(?:\.\d+)?)\s*lakh/i,
  );
  if (lakhRangeOnce) {
    const low = parseFloat(lakhRangeOnce[1]!);
    if (Number.isFinite(low) && low >= 0) {
      const amount = Math.round(low * 100_000);
      return {
        amount,
        sourceText: s,
        range: true,
        warning: `Price range "${s}" — using starting price ₹${amount.toLocaleString("en-IN")}`,
      };
    }
  }

  const croreRangeOnce = compact.match(
    /(\d+(?:\.\d+)?)\s*[-–—](?:\s*to\s*)?\s*(\d+(?:\.\d+)?)\s*cr(?:ore)?/i,
  );
  if (croreRangeOnce) {
    const low = parseFloat(croreRangeOnce[1]!);
    if (Number.isFinite(low) && low >= 0) {
      const amount = Math.round(low * 10_000_000);
      return {
        amount,
        sourceText: s,
        range: true,
        warning: `Price range "${s}" — using starting price ₹${amount.toLocaleString("en-IN")}`,
      };
    }
  }

  if (hasRangeSep && lakhMatches.length >= 2) {
    const low = parseFloat(lakhMatches[0]![1]!);
    if (Number.isFinite(low) && low >= 0) {
      const amount = Math.round(low * 100_000);
      return {
        amount,
        sourceText: s,
        range: true,
        warning: `Price range "${s}" — using starting price ₹${amount.toLocaleString("en-IN")}`,
      };
    }
  }

  if (hasRangeSep && croreMatches.length >= 2) {
    const low = parseFloat(croreMatches[0]![1]!);
    if (Number.isFinite(low) && low >= 0) {
      const amount = Math.round(low * 10_000_000);
      return {
        amount,
        sourceText: s,
        range: true,
        warning: `Price range "${s}" — using starting price ₹${amount.toLocaleString("en-IN")}`,
      };
    }
  }

  if (lakhMatches.length === 1 && !hasRangeSep) {
    const lakhs = parseFloat(lakhMatches[0]![1]!);
    if (Number.isFinite(lakhs) && lakhs >= 0) {
      return { amount: Math.round(lakhs * 100_000), sourceText: s, range: false };
    }
  }

  if (croreMatches.length === 1 && !hasRangeSep) {
    const crores = parseFloat(croreMatches[0]![1]!);
    if (Number.isFinite(crores) && crores >= 0) {
      return { amount: Math.round(crores * 10_000_000), sourceText: s, range: false };
    }
  }

  if (/[a-zA-Z]/.test(compact) || hasRangeSep) {
    return {
      amount: null,
      sourceText: s,
      range: hasRangeSep,
      warning: `Price text "${s}" kept as Price on request`,
    };
  }

  return { amount: null, sourceText: s, range: false, warning: `Could not parse price "${s}" — Price on request` };
}

function mapRawRow(row: Record<string, unknown>, rowNumber: number): {
  data?: ParsedInventoryRow;
  errors: RowValidationError[];
  warnings: RowValidationError[];
} {
  const errors: RowValidationError[] = [];
  const warnings: RowValidationError[] = [];
  const get = (col: InventoryColumn) => {
    const key = Object.keys(row).find((k) => normalizeHeader(k) === col);
    return key ? row[key] : undefined;
  };

  const brand = blankToEmpty(get("Brand"));
  const model = blankToEmpty(get("Model"));

  // Skip placeholder rows with neither brand nor model
  if (!brand && !model) return { errors: [], warnings: [] };

  if (!brand) errors.push({ row: rowNumber, field: "Brand", message: "Brand is required" });
  if (!model) errors.push({ row: rowNumber, field: "Model", message: "Model is required" });
  if (errors.length) return { errors, warnings };

  const yearRaw = parseNumber(get("Year"));
  let year = new Date().getFullYear();
  if (yearRaw != null) {
    if (!Number.isInteger(yearRaw) || yearRaw < 1990 || yearRaw > new Date().getFullYear() + 2) {
      errors.push({ row: rowNumber, field: "Year", message: "Invalid year" });
    } else {
      year = yearRaw;
    }
  } else {
    warnings.push({ row: rowNumber, field: "Year", message: "Year blank — using current year (editable later)" });
  }

  const priceCell = parseDealerPriceText(get("Price") || get("Ex-Showroom Price"));
  const dealerCell = parseDealerPriceText(get("Dealer Price"));
  const onRoadCell = parseDealerPriceText(get("On-Road Price"));
  if (priceCell.warning) warnings.push({ row: rowNumber, field: "Price", message: priceCell.warning });
  if (dealerCell.warning) warnings.push({ row: rowNumber, field: "Dealer Price", message: dealerCell.warning });
  if (onRoadCell.warning) warnings.push({ row: rowNumber, field: "On-Road Price", message: onRoadCell.warning });

  const dealerPrice = dealerCell.amount != null && dealerCell.amount > 0 ? dealerCell.amount : undefined;
  const priceAmount = priceCell.amount ?? dealerPrice ?? 0;
  const priceOnRequest = priceAmount <= 0;
  const priceSourceText =
    priceCell.sourceText || dealerCell.sourceText || undefined;

  if (priceOnRequest && !priceCell.sourceText && !dealerCell.sourceText) {
    warnings.push({ row: rowNumber, field: "Price", message: "Price blank — saved as Price on request" });
  }

  const kmsRaw = parseNumber(get("KM Driven"));
  const kmsDriven = kmsRaw != null && kmsRaw >= 0 ? kmsRaw : 0;

  const ownersRaw = parseNumber(get("Ownership"));
  // New stock (0 km) → 0 owners; used stock blank ownership defaults to 1
  const ownership =
    ownersRaw != null && ownersRaw >= 0
      ? Math.min(10, Math.floor(ownersRaw))
      : kmsDriven < 100
        ? 0
        : 1;
  if (ownersRaw == null && kmsDriven >= 100) {
    warnings.push({ row: rowNumber, field: "Ownership", message: "Ownership blank — defaulted to 1" });
  }

  if (errors.length) return { errors, warnings };

  const fuel = blankToEmpty(get("Fuel"));
  const transmission = blankToEmpty(get("Transmission"));
  if (!fuel) warnings.push({ row: rowNumber, field: "Fuel", message: "Fuel blank — left empty (not invented)" });
  if (!transmission) {
    warnings.push({ row: rowNumber, field: "Transmission", message: "Transmission blank — left empty (not invented)" });
  }
  const variant = blankToEmpty(get("Variant")) || undefined;
  if (!variant) {
    warnings.push({ row: rowNumber, field: "Variant", message: "Variant blank — can be added later" });
  }

  const imageUrls = collectImageUrls(get("Main Image URL"), get("Image URL 2"), get("Image URL 3"), get("Image URL 4"));

  const featuresRaw = blankToEmpty(get("Features"));
  const features = featuresRaw
    ? featuresRaw
        .split(/[|;,]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 20)
    : undefined;

  const parsed: ParsedInventoryRow = {
    rowNumber,
    brand,
    model,
    variant,
    year,
    fuel,
    transmission,
    kmsDriven,
    ownership,
    price: priceAmount,
    color: blankToEmpty(get("Color")) || undefined,
    registrationState: blankToEmpty(get("Registration State")) || "",
    description: blankToEmpty(get("Description")) || undefined,
    dealerPrice,
    discount: parseNumber(get("Discount")),
    mainImageUrl: imageUrls[0],
    imageUrls,
    priceOnRequest,
    priceSourceText,
    bodyType: blankToEmpty(get("Body Type")) || undefined,
    engineCc: blankToEmpty(get("Engine CC")) || undefined,
    mileage: blankToEmpty(get("Mileage")) || undefined,
    rangeKm: blankToEmpty(get("Range Km")) || undefined,
    batteryKwh: blankToEmpty(get("Battery kWh")) || undefined,
    power: blankToEmpty(get("Power")) || undefined,
    torque: blankToEmpty(get("Torque")) || undefined,
    seating: blankToEmpty(get("Seating")) || undefined,
    bootSpace: blankToEmpty(get("Boot Space")) || undefined,
    groundClearance: blankToEmpty(get("Ground Clearance")) || undefined,
    driveType: blankToEmpty(get("Drive Type")) || undefined,
    airbags: blankToEmpty(get("Airbags")) || undefined,
    onRoadPrice: onRoadCell.amount != null && onRoadCell.amount > 0 ? onRoadCell.amount : undefined,
    waitingPeriodDays: blankToEmpty(get("Waiting Period Days")) || undefined,
    brochureUrl: blankToEmpty(get("Brochure URL")) || undefined,
    features,
  };

  const result = rowSchema.safeParse({
    ...parsed,
    mainImageUrl: parsed.mainImageUrl || undefined,
  });

  if (!result.success) {
    result.error.issues.forEach((issue) => {
      errors.push({ row: rowNumber, field: issue.path.join("."), message: issue.message });
    });
    return { errors, warnings };
  }

  return { data: parsed, errors: [], warnings };
}

export function parseWorkbook(buffer: ArrayBuffer): {
  rows: ParsedInventoryRow[];
  errors: RowValidationError[];
  warnings: RowValidationError[];
} {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const rows: ParsedInventoryRow[] = [];
  const errors: RowValidationError[] = [];
  const warnings: RowValidationError[] = [];

  json.forEach((raw, idx) => {
    const rowNumber = idx + 2;
    const { data, errors: rowErrors, warnings: rowWarnings } = mapRawRow(raw, rowNumber);
    if (rowWarnings.length) warnings.push(...rowWarnings);
    if (rowErrors.length) errors.push(...rowErrors);
    else if (data) rows.push(data);
  });

  return { rows, errors, warnings };
}

export function parseCSV(text: string): { rows: ParsedInventoryRow[]; errors: RowValidationError[]; warnings: RowValidationError[] } {
  const wb = XLSX.read(text, { type: "string" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return parseWorkbook(buffer);
}

export function downloadSampleTemplate() {
  const ws = XLSX.utils.json_to_sheet(SAMPLE_ROWS, { header: [...INVENTORY_COLUMNS] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "New Cars");
  const guide = XLSX.utils.aoa_to_sheet([
    ["MotorCart inventory demo (ICE + EV)"],
    ["Required: Brand, Model"],
    ["EV: Fuel=Electric, fill Range Km + Battery kWh, leave Engine CC blank"],
    ["ICE: fill Engine CC + Mileage; leave Range/Battery blank"],
    ["Features: separate with |"],
  ]);
  XLSX.utils.book_append_sheet(wb, guide, "Instructions");
  XLSX.writeFile(wb, "motorcart-new-car-inventory-demo.xlsx");
}

export function parsedRowToVehiclePayload(
  row: ParsedInventoryRow,
  dealer: { city: string; state: string; dealerType: string }
) {
  const discountPct = row.discount ?? 0;
  const finalPrice = row.dealerPrice && row.dealerPrice > 0 ? row.dealerPrice : row.price;
  const isNewCarDealer = dealer.dealerType === "new_car_dealer";
  const isNewStock = isNewCarDealer || row.kmsDriven < 100;
  const category = isNewCarDealer
    ? "new-cars"
    : dealer.dealerType === "bike_dealer"
      ? "bikes"
      : dealer.dealerType === "truck_dealer"
        ? "trucks"
        : isNewStock
          ? "new-cars"
          : "used-cars";

  const bodyType =
    row.bodyType?.trim() ||
    (category === "bikes" ? "Bike" : category === "trucks" ? "Truck" : "");

  const specifications: Record<string, string> = {};
  const fuelIsEv = /electric|\bev\b/i.test(row.fuel ?? "");
  if (row.engineCc?.trim()) {
    const eng = row.engineCc.trim();
    const skipCc = fuelIsEv || /kwh|kw\b|battery/i.test(eng) || /cc/i.test(eng);
    specifications.engine = skipCc ? eng : `${eng} cc`;
  }
  if (row.mileage?.trim()) specifications.mileage = row.mileage.trim();
  if (row.rangeKm?.trim()) {
    const range = /km/i.test(row.rangeKm) ? row.rangeKm.trim() : `${row.rangeKm.trim()} km`;
    specifications.rangeKm = range;
    if (!row.mileage?.trim() && fuelIsEv) specifications.mileage = range;
  }
  if (row.batteryKwh?.trim()) {
    const batt = /kwh/i.test(row.batteryKwh) ? row.batteryKwh.trim() : `${row.batteryKwh.trim()} kWh`;
    specifications.battery = batt;
  }
  if (row.power?.trim()) specifications.power = row.power.trim();
  if (row.torque?.trim()) specifications.torque = row.torque.trim();
  if (row.seating?.trim()) specifications.seating = row.seating.trim();
  if (row.bootSpace?.trim()) specifications.bootSpace = row.bootSpace.trim();
  if (row.groundClearance?.trim()) specifications.groundClearance = row.groundClearance.trim();
  if (row.driveType?.trim()) specifications.driveType = row.driveType.trim();
  if (row.airbags?.trim()) specifications.airbags = row.airbags.trim();
  if (row.bodyType?.trim()) specifications.bodyType = row.bodyType.trim();
  if (row.fuel?.trim()) specifications.fuel = row.fuel.trim();
  if (row.transmission?.trim()) specifications.transmission = row.transmission.trim();

  return {
    title: `${row.brand} ${row.model}${row.variant ? ` ${row.variant}` : ""}`.trim(),
    brand: row.brand,
    model: row.model,
    variant: row.variant,
    year: row.year,
    price: finalPrice > 0 ? finalPrice : 0,
    originalPrice: discountPct > 0 && row.price > 0 ? row.price : row.price > 0 ? row.price : undefined,
    fuelType: row.fuel,
    transmission: row.transmission,
    bodyType,
    category,
    kmsDriven: isNewStock ? 0 : row.kmsDriven,
    owners: isNewStock ? 0 : row.ownership,
    color: row.color,
    city: dealer.city,
    state: row.registrationState || dealer.state,
    description: row.description,
    images: row.imageUrls?.length ? row.imageUrls : row.mainImageUrl ? [row.mainImageUrl] : [],
    features: row.features ?? [],
    condition: isNewStock ? ("new" as const) : ("used" as const),
    metadata: {
      discountPercent: discountPct,
      specifications,
      importSource: "bulk_upload",
      priceOnRequest: Boolean(row.priceOnRequest) || !(finalPrice > 0),
      priceDisplay: row.priceOnRequest || !(finalPrice > 0) ? "Price on request" : undefined,
      priceSourceText: row.priceSourceText,
      priceRange: Boolean(row.priceSourceText && /[-–—]|(\bto\b)/i.test(row.priceSourceText || "")),
      onRoadPrice: row.onRoadPrice,
      waitingPeriod: row.waitingPeriodDays,
      brochureUrl: row.brochureUrl,
    },
  };
}

/** Kept for callers — do not invent specs; only echo uploaded fuel/transmission. */
export function generateAISpecs(row: ParsedInventoryRow): Record<string, string> {
  const specs: Record<string, string> = {};
  if (row.fuel?.trim()) specs.fuel = row.fuel.trim();
  if (row.transmission?.trim()) specs.transmission = row.transmission.trim();
  return specs;
}

export function detectDuplicates(
  rows: ParsedInventoryRow[],
  existing: { brand: string; model: string; year: number; kms_driven: number }[]
): Map<number, string> {
  const dupes = new Map<number, string>();
  const keys = new Set(existing.map((v) => `${v.brand}|${v.model}|${v.year}|${v.kms_driven}`.toLowerCase()));

  rows.forEach((r) => {
    const key = `${r.brand}|${r.model}|${r.year}|${r.kmsDriven}`.toLowerCase();
    if (keys.has(key)) dupes.set(r.rowNumber, "Duplicate: same brand, model, year & KM already in inventory");
    keys.add(key);
  });

  return dupes;
}
