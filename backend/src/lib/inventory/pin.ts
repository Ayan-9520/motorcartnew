import { InventoryError } from "./errors";

/** India PIN — existing MotorCart convention (quotations, etc.). */
export const INDIA_PIN_RE = /^[1-9][0-9]{5}$/;

const INDIA_COUNTRY_CODES = new Set(["IN", "IND", "INDIA"]);

export function validateIndiaPincode(raw: unknown): string {
  const pin = String(raw ?? "").trim();
  if (!INDIA_PIN_RE.test(pin)) {
    throw new InventoryError("Invalid pincode", 400, "INVALID_PINCODE");
  }
  return pin;
}

/** Read only `pincode`. Extra query params (dealerId, organizationId, branchId) are ignored. */
export function pincodeFromSearchParams(sp: { get(name: string): string | null }): string {
  return validateIndiaPincode(sp.get("pincode"));
}

export function isIndiaCompatibleCountry(country: string | null | undefined): boolean {
  if (!country) return false;
  return INDIA_COUNTRY_CODES.has(country.trim().toUpperCase());
}
