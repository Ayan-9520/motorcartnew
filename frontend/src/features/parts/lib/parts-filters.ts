import type { PartProduct } from "../types";

export type PartsBrowseFilter = {
  dealer?: boolean;
  pay?: string | null;
  delivery?: string | null;
  brand?: string | null;
};

export const PARTS_FILTER_LABELS: Record<string, string> = {
  dealer: "Wholesale / B2B",
  cod: "COD available",
  fast: "Same-day metro",
};

export function applyPartsBrowseFilters(parts: PartProduct[], filters: PartsBrowseFilter): PartProduct[] {
  let result = parts;

  if (filters.dealer) {
    result = result.filter((p) => p.wholesalePrice != null && p.wholesalePrice < p.price && p.bulkMinQty > 1);
  }

  if (filters.pay === "cod") {
    result = result.filter((p) => p.price <= 150000);
  }

  if (filters.delivery === "fast") {
    result = result.filter((p) => p.isFeatured || p.stock >= 40);
  }

  if (filters.brand?.trim()) {
    const b = filters.brand.trim().toLowerCase();
    result = result.filter((p) => p.brand?.toLowerCase().includes(b));
  }

  return result;
}

export function parsePartsBrowseFilters(params: URLSearchParams): PartsBrowseFilter {
  return {
    dealer: params.get("dealer") === "1",
    pay: params.get("pay"),
    delivery: params.get("delivery"),
    brand: params.get("brand"),
  };
}
