import { SuperAppError } from "./errors";

const ALLOWED = [
  "category",
  "condition",
  "brand",
  "model",
  "variant",
  "budgetMin",
  "budgetMax",
  "fuel",
  "transmission",
  "city",
  "pincode",
  "yearMin",
  "yearMax",
  "kmMax",
  "owners",
] as const;

export type SavedSearchCriteria = Partial<Record<(typeof ALLOWED)[number], string | number>>;

export function normalizeSearchCriteria(input: Record<string, unknown>): SavedSearchCriteria {
  const out: SavedSearchCriteria = {};
  for (const key of ALLOWED) {
    const v = input[key];
    if (v == null || v === "") continue;
    if (key === "pincode") {
      const pin = String(v).replace(/\D/g, "");
      if (!/^\d{6}$/.test(pin)) throw new SuperAppError("PIN must be 6 digits", 400, "INVALID_PIN");
      out.pincode = pin;
      continue;
    }
    if (typeof v === "number" || /^\d+(\.\d+)?$/.test(String(v))) {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) throw new SuperAppError("Invalid numeric filter", 400, "INVALID_FILTER");
      out[key] = n;
    } else {
      out[key] = String(v).slice(0, 80);
    }
  }
  return out;
}
