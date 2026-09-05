/**
 * New-car stock is available only when stock > 0 and status is on this allow-list.
 * Unknown statuses are excluded (safe default). Do not invent statuses.
 */
export const AVAILABLE_NEW_CAR_STOCK_STATUSES = new Set(["available"]);

export const EXCLUDED_NEW_CAR_STOCK_STATUSES = [
  "out_of_stock",
  "booked",
  "transit",
  "upcoming",
  "delivered",
  "reserved",
  "sold",
] as const;

export function isAvailableNewCarStock(stock: number, stockStatus: string | null | undefined): boolean {
  if (!Number.isFinite(stock) || stock <= 0) return false;
  const status = String(stockStatus ?? "").trim().toLowerCase();
  return AVAILABLE_NEW_CAR_STOCK_STATUSES.has(status);
}

export function isAvailableMarketplaceVehicle(status: string | null | undefined, deletedAt: Date | null | undefined): boolean {
  if (deletedAt) return false;
  return status === "available";
}
