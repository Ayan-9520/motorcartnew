import type { SearchCategoryDef } from "./types";

export const SEARCH_CATEGORIES: SearchCategoryDef[] = [
  { id: "vehicles", label: "Vehicles", result_types: ["vehicle", "new_car", "used_car", "bike", "new_car_stock"] },
  { id: "auctions", label: "Auctions", result_types: ["auction"] },
  { id: "dealers", label: "Dealers", result_types: ["dealer"] },
  { id: "companies", label: "Companies", result_types: ["company", "business_page"] },
  { id: "brokers", label: "Brokers", result_types: ["broker"] },
  { id: "dsa", label: "DSA", result_types: ["dsa"] },
  { id: "finance", label: "Finance", result_types: ["finance_product"] },
  { id: "insurance", label: "Insurance", result_types: ["insurance_agent", "insurance_partner"] },
  { id: "workshops", label: "Workshops", result_types: ["workshop", "service_center"] },
  { id: "parts_sellers", label: "Parts sellers", result_types: ["parts_seller"] },
  { id: "parts", label: "Parts", result_types: ["part"] },
  { id: "jobs", label: "Jobs", result_types: ["job"] },
  { id: "professionals", label: "Professionals", result_types: ["professional"] },
  { id: "community", label: "Community", result_types: ["community_post", "community_group"] },
  { id: "business", label: "Business pages", result_types: ["business_page", "directory_listing", "company"] },
];

const TYPE_ALIASES: Record<string, string> = {
  vehicle: "vehicles",
  vehicles: "vehicles",
  dealer: "dealers",
  dealers: "dealers",
  part: "parts",
  parts: "parts",
  job: "jobs",
  jobs: "jobs",
  mechanic: "jobs",
  finance: "finance",
  insurance: "insurance",
  company: "companies",
  companies: "companies",
  workshop: "workshops",
  service: "workshops",
  professional: "professionals",
};

export function categoryFilterTypes(categoryId: string | undefined): string[] | null {
  if (!categoryId) return null;
  const id = TYPE_ALIASES[categoryId] ?? categoryId;
  const cat = SEARCH_CATEGORIES.find((c) => c.id === id);
  return cat ? cat.result_types : null;
}
