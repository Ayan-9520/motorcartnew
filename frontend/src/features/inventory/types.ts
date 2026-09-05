export type StockByPinSource = "new_car_inventory" | "vehicle";

export type StockByPinBranch = {
  id: string;
  name: string;
  pincode: string;
};

export type StockByPinItem = {
  source: StockByPinSource;
  inventoryId?: string;
  vehicleId?: string;
  dealerId: string;
  dealerName: string;
  city: string;
  state: string;
  branch?: StockByPinBranch;
  availability: "available";
  stock?: number;
  catalogVariantId?: string;
  brand?: string;
  model?: string;
  variant?: string;
  year?: number;
  title?: string;
  slug?: string;
  category?: string;
};

export type StockByPinResponse = {
  pincode: string;
  count: number;
  items: StockByPinItem[];
};

export const INDIA_PIN_RE = /^[1-9][0-9]{5}$/;

export function stockItemDetailPath(item: StockByPinItem): string | null {
  if (item.source === "vehicle" && item.slug) {
    if (item.category === "new-cars") return `/new-cars/${item.slug}`;
    return `/vehicles/${item.category || "used-cars"}/${item.slug}`;
  }
  if (item.source === "new_car_inventory" && item.inventoryId) {
    return `/new-cars/${item.inventoryId}`;
  }
  return null;
}

export function stockItemLabel(item: StockByPinItem): string {
  const parts = [item.brand, item.model, item.variant].filter(Boolean);
  if (parts.length) return parts.join(" ");
  if (item.title) return item.title;
  return item.source === "vehicle" ? "Vehicle" : "Inventory";
}
