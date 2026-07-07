import type { SearchCategoryDef } from "./types";

export const SEARCH_CATEGORIES: SearchCategoryDef[] = [
  { id: "vehicles", label: "Vehicles", result_types: ["vehicle", "new_car", "used_car", "bike"] },
  { id: "auctions", label: "Auctions", result_types: ["auction"] },
  { id: "dealers", label: "Dealers", result_types: ["dealer"] },
  { id: "brokers", label: "Brokers", result_types: ["broker"] },
  { id: "dsa", label: "DSA", result_types: ["dsa"] },
  { id: "insurance", label: "Insurance agents", result_types: ["insurance_agent"] },
  { id: "workshops", label: "Workshops", result_types: ["workshop"] },
  { id: "parts_sellers", label: "Parts sellers", result_types: ["parts_seller"] },
  { id: "parts", label: "Parts catalog", result_types: ["parts_seller"] },
  { id: "community", label: "Community", result_types: ["community_post", "community_group"] },
  { id: "business", label: "Business pages", result_types: ["business_page", "directory_listing"] },
  { id: "growth", label: "Growth templates", result_types: ["growth_template"] },
];

export function categoryFilterTypes(categoryId: string | undefined): string[] | null {
  if (!categoryId) return null;
  const cat = SEARCH_CATEGORIES.find((c) => c.id === categoryId);
  return cat ? cat.result_types : null;
}
