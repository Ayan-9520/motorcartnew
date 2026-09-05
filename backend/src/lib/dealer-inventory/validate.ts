import { STOCK_STATUSES, type StockStatus } from "./constants";
import { DealerInventoryError } from "./errors";

export type InventoryInput = {
  brand: string;
  model: string;
  /** Blank variant stays null — do not invent "Standard". */
  variant: string | null;
  year: number;
  fuelType: string | null;
  transmission: string | null;
  colour?: string;
  colors?: string[];
  stock: number;
  stockStatus: StockStatus;
  /** Schema requires Decimal — 0 means unset / price on request (not a market estimate). */
  exShowroomPrice: number;
  dealerPrice?: number | null;
  discountAmount?: number;
  branchId?: string | null;
  branchName?: string | null;
  pincode?: string | null;
  internalReference?: string | null;
  expectedAvailability?: string | null;
  notes?: string | null;
  imageUrl?: string | null;
  expectedDeliveryDays?: number | null;
  /** Original spreadsheet price text when non-deterministic (ranges, prose). */
  priceSourceText?: string | null;
  priceOnRequest: boolean;
  kmDriven?: string | null;
  ownership?: string | null;
  registrationState?: string | null;
  bodyType?: string | null;
  engineCc?: string | null;
  mileage?: string | null;
  /** EV claimed range — e.g. "452 km". */
  rangeKm?: string | null;
  /** EV pack size — e.g. "40.5 kWh". */
  batteryKwh?: string | null;
  power?: string | null;
  torque?: string | null;
  seating?: string | null;
  bootSpace?: string | null;
  groundClearance?: string | null;
  driveType?: string | null;
  airbags?: string | null;
  onRoadPriceText?: string | null;
  waitingPeriodDays?: string | null;
  brochureUrl?: string | null;
  featuresText?: string | null;
  /** Soft issues that must not block import. */
  warnings: string[];
};

/** Treat Excel/CSV blank-ish tokens as empty. */
export function blankToEmpty(v: unknown): string {
  if (v == null) return "";
  // Coerce Excel numbers; treat bare 0 in optional numeric columns only at call sites when needed.
  const s = String(v)
    .replace(/\u00a0/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
  if (!s) return "";
  const lower = s.toLowerCase();
  if (
    lower === "undefined" ||
    lower === "null" ||
    lower === "nan" ||
    lower === "n/a" ||
    lower === "na" ||
    lower === "-" ||
    lower === "invalid date"
  ) {
    return "";
  }
  return s;
}

function trim(v: unknown, max = 120): string {
  return blankToEmpty(v).slice(0, max);
}

/**
 * Parse dealer price cells.
 * - Exact integers / "1369000" → amount
 * - Single "Rs. 13.69 Lakh" → 1_369_000
 * - Ranges "Rs. 19.45 - 27.70 Lakh" → no invented amount; preserve source text
 */
export function parseDealerPriceText(raw: unknown): {
  amount: number | null;
  sourceText: string | null;
  range: boolean;
  warning?: string;
} {
  const s = blankToEmpty(raw);
  if (!s) return { amount: null, sourceText: null, range: false };

  const compact = s.replace(/,/g, "").replace(/\s+/g, " ").trim();

  // Pure numeric (optional currency symbol)
  const pure = compact.replace(/^(rs\.?|inr|₹)\s*/i, "");
  if (/^\d+(\.\d+)?$/.test(pure)) {
    const n = Number(pure);
    if (Number.isFinite(n) && n >= 0) {
      return { amount: Math.round(n), sourceText: s, range: false };
    }
  }

  const hasRangeSep = /[-–—]|(\bto\b)/i.test(compact);
  const lakhMatches = [...compact.matchAll(/(\d+(?:\.\d+)?)\s*lakh/gi)];
  const croreMatches = [...compact.matchAll(/(\d+(?:\.\d+)?)\s*cr(?:ore)?/gi)];

  if (hasRangeSep && (lakhMatches.length >= 2 || croreMatches.length >= 2 || /\d+(?:\.\d+)?\s*[-–—]\s*\d+/.test(compact))) {
    return {
      amount: null,
      sourceText: s,
      range: true,
      warning: `Price range "${s}" preserved — no exact numeric price set (Price on request).`,
    };
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

  // Non-deterministic prose
  if (/[a-zA-Z]/.test(compact) || hasRangeSep) {
    return {
      amount: null,
      sourceText: s,
      range: hasRangeSep,
      warning: `Price text "${s}" could not be converted to an exact amount — Price on request.`,
    };
  }

  const n = Number(pure.replace(/[^\d.]/g, ""));
  if (Number.isFinite(n) && n >= 0) {
    return { amount: Math.round(n), sourceText: s, range: false };
  }

  return {
    amount: null,
    sourceText: s,
    range: false,
    warning: `Price text "${s}" could not be converted — Price on request.`,
  };
}

export function parseStockStatus(raw: unknown, fallback: StockStatus = "available"): StockStatus {
  const s = blankToEmpty(raw).toLowerCase().replace(/\s+/g, "_");
  if (!s) return fallback;
  if ((STOCK_STATUSES as readonly string[]).includes(s)) return s as StockStatus;
  throw new DealerInventoryError(`Invalid stock status: ${String(raw)}`, 400, "INVALID_STOCK_STATUS");
}

/**
 * Shared single-add + bulk validation.
 * Mandatory: brand, model only.
 * Variant / stock / all other fields optional (stock defaults to 1).
 */
export function validateInventoryInput(raw: Record<string, unknown>, _opts?: { requireVariant?: boolean }): InventoryInput {
  const warnings: string[] = [];
  const brand = trim(raw.brand ?? raw.make);
  const model = trim(raw.model);
  const variantRaw = blankToEmpty(raw.variant ?? raw.trim);
  const variant = variantRaw ? variantRaw.slice(0, 80) : null;

  if (!brand) throw new DealerInventoryError("Brand is required", 400, "BRAND_REQUIRED");
  if (!model) throw new DealerInventoryError("Model is required", 400, "MODEL_REQUIRED");
  if (!variant) {
    warnings.push("Variant blank — inventory imported without variant (catalog may be unmapped).");
  }

  const yearBlank = !blankToEmpty(raw.year ?? raw.model_year ?? raw.modelYear);
  let year = new Date().getFullYear();
  if (!yearBlank) {
    const yearRaw = Number(String(blankToEmpty(raw.year ?? raw.model_year ?? raw.modelYear)).replace(/,/g, ""));
    if (!Number.isInteger(yearRaw) || yearRaw < 1990 || yearRaw > new Date().getFullYear() + 2) {
      throw new DealerInventoryError("Invalid model year", 400, "INVALID_YEAR");
    }
    year = yearRaw;
  }

  const stockBlank = !blankToEmpty(raw.stock ?? raw.qty ?? raw.quantity);
  let stock = 1;
  if (!stockBlank) {
    stock = Number(String(blankToEmpty(raw.stock ?? raw.qty ?? raw.quantity)).replace(/,/g, ""));
    if (!Number.isInteger(stock) || stock < 0) {
      throw new DealerInventoryError("Stock must be an integer >= 0", 400, "INVALID_STOCK");
    }
  }

  // Prefer dealer_price when present; Price column may be a range / lakh string.
  const dealerCell = parseDealerPriceText(raw.dealer_price ?? raw.dealerPrice);
  const priceCell = parseDealerPriceText(raw.price ?? raw.selling_price);
  const exCell = parseDealerPriceText(raw.ex_showroom_price ?? raw.exShowroomPrice ?? raw.ex_showroom);

  for (const cell of [dealerCell, priceCell, exCell]) {
    if (cell.warning) warnings.push(cell.warning);
  }

  const dealerPrice = dealerCell.amount;
  if (dealerPrice != null && dealerPrice < 0) {
    throw new DealerInventoryError("Dealer price must be >= 0", 400, "INVALID_DEALER_PRICE");
  }
  const exOpt = exCell.amount ?? priceCell.amount;
  if (exOpt != null && exOpt < 0) {
    throw new DealerInventoryError("Ex-showroom price must be >= 0", 400, "INVALID_PRICE");
  }

  const exShowroomPrice = exOpt ?? (dealerPrice != null ? dealerPrice : 0);
  const priceOnRequest = exShowroomPrice <= 0 && (dealerPrice == null || dealerPrice <= 0);
  const priceSourceText =
    (priceOnRequest
      ? dealerCell.sourceText || priceCell.sourceText || exCell.sourceText
      : priceCell.sourceText || dealerCell.sourceText || exCell.sourceText) || null;

  // Discount: accept blank; numeric only when deterministic. Percentage-looking small values stay as entered amount (existing semantics).
  const discountRaw = blankToEmpty(raw.discount ?? raw.discount_amount ?? raw.discountAmount);
  let discountAmount = 0;
  if (discountRaw) {
    const d = Number(discountRaw.replace(/,/g, ""));
    if (!Number.isFinite(d) || d < 0) {
      throw new DealerInventoryError("Discount must be >= 0", 400, "INVALID_DISCOUNT");
    }
    discountAmount = d;
  }

  const stockStatus = parseStockStatus(
    raw.stock_status ?? raw.stockStatus,
    stock === 0 ? "out_of_stock" : "available",
  );

  const colour = trim(raw.colour ?? raw.color, 60) || undefined;
  const colorsFromArr = Array.isArray(raw.colors)
    ? (raw.colors as unknown[]).map((c) => trim(c, 60)).filter(Boolean)
    : [];
  const colors = coloursMerge(colour, colorsFromArr);

  const pincode = trim(raw.pincode ?? raw.postal_code ?? raw.postalCode ?? raw.pin ?? raw.pin_code, 16) || null;
  if (pincode && !/^\d{6}$/.test(pincode)) {
    throw new DealerInventoryError(
      `Invalid PIN "${pincode}". Enter a 6-digit PIN or leave the field blank.`,
      400,
      "INVALID_PIN",
    );
  }

  const deliveryRaw = blankToEmpty(raw.expected_delivery_days ?? raw.expectedDeliveryDays);
  const deliveryNum = deliveryRaw ? Number(deliveryRaw.replace(/,/g, "")) : null;

  const fuel = trim(raw.fuel_type ?? raw.fuelType ?? raw.fuel, 40) || null;
  const transmission = trim(raw.transmission, 40) || null;

  return {
    brand,
    model,
    variant,
    year,
    fuelType: fuel,
    transmission,
    colour,
    colors,
    stock,
    stockStatus: stock === 0 && stockStatus === "available" ? "out_of_stock" : stockStatus,
    exShowroomPrice,
    dealerPrice: dealerPrice != null && dealerPrice > 0 ? dealerPrice : null,
    discountAmount,
    branchId: trim(raw.branch_id ?? raw.branchId, 64) || null,
    branchName: trim(raw.branch ?? raw.branch_name ?? raw.branchName, 120) || null,
    pincode,
    internalReference: trim(raw.internal_reference ?? raw.internalReference ?? raw.sku ?? raw.ref ?? raw.reference, 80) || null,
    expectedAvailability: trim(raw.expected_availability ?? raw.expectedAvailability, 80) || null,
    notes: trim(raw.notes ?? raw.description, 500) || null,
    imageUrl: trim(raw.image_url ?? raw.imageUrl ?? raw.image ?? raw.main_image_url, 512) || null,
    expectedDeliveryDays: deliveryNum != null && Number.isFinite(deliveryNum) ? deliveryNum : null,
    priceSourceText,
    priceOnRequest,
    kmDriven: trim(raw.km_driven ?? raw.kms ?? raw.kilometers, 40) || null,
    ownership: trim(raw.ownership ?? raw.owners, 40) || null,
    registrationState: trim(raw.registration_state ?? raw.reg_state, 80) || null,
    bodyType: trim(raw.body_type ?? raw.bodyType ?? raw.body, 40) || null,
    engineCc: trim(raw.engine_cc ?? raw.engineCc ?? raw.cc ?? raw.engine ?? raw.engine_capacity, 40) || null,
    mileage: trim(raw.mileage ?? raw.mileage_kmpl ?? raw.arai_mileage, 40) || null,
    rangeKm: trim(raw.range_km ?? raw.rangeKm ?? raw.range ?? raw.ev_range ?? raw.claimed_range, 40) || null,
    batteryKwh:
      trim(raw.battery_kwh ?? raw.batteryKwh ?? raw.battery ?? raw.battery_capacity ?? raw.battery_pack, 40) || null,
    power: trim(raw.power ?? raw.bhp ?? raw.max_power, 40) || null,
    torque: trim(raw.torque ?? raw.nm ?? raw.max_torque, 40) || null,
    seating: trim(raw.seating ?? raw.seating_capacity ?? raw.seats, 20) || null,
    bootSpace: trim(raw.boot_space ?? raw.boot ?? raw.boot_space_litres, 40) || null,
    groundClearance: trim(raw.ground_clearance ?? raw.ground_clearance_mm, 40) || null,
    driveType: trim(raw.drive_type ?? raw.drivetrain, 40) || null,
    airbags: trim(raw.airbags ?? raw.safety_airbags, 40) || null,
    onRoadPriceText: trim(raw.on_road_price ?? raw.onRoadPrice ?? raw.on_road, 80) || null,
    waitingPeriodDays: trim(raw.waiting_period_days ?? raw.waiting_period ?? raw.waitingPeriodDays, 40) || null,
    brochureUrl: trim(raw.brochure_url ?? raw.brochureUrl ?? raw.brochure, 512) || null,
    featuresText: trim(raw.features ?? raw.key_features, 500) || null,
    warnings,
  };
}

function coloursMerge(primary: string | undefined, list: string[]): string[] {
  const out: string[] = [];
  if (primary) out.push(primary);
  for (const c of list) {
    if (!out.some((x) => x.toLowerCase() === c.toLowerCase())) out.push(c);
  }
  return out;
}

export function stripClientOwnedInventoryFields(raw: Record<string, unknown>): Record<string, unknown> {
  const blocked = [
    "dealerId",
    "dealer_id",
    "organizationId",
    "organization_id",
    "userId",
    "user_id",
    "ownerId",
    "owner_id",
    "createdBy",
    "created_by",
    "catalogVariantId",
    "catalog_variant_id",
    "id",
  ];
  const out = { ...raw };
  for (const k of blocked) delete out[k];
  return out;
}
