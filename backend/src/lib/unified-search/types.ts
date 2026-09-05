export type SearchResultType =
  | "vehicle"
  | "new_car"
  | "used_car"
  | "bike"
  | "auction"
  | "dealer"
  | "broker"
  | "dsa"
  | "insurance_agent"
  | "workshop"
  | "parts_seller"
  | "part"
  | "community_post"
  | "community_group"
  | "business_page"
  | "directory_listing"
  | "company"
  | "job"
  | "professional"
  | "finance_product"
  | "insurance_partner"
  | "service_center"
  | "new_car_stock"
  | "growth_template";

export type UnifiedSearchResult = {
  result_type: SearchResultType;
  title: string;
  description: string;
  url: string;
  source: string;
  score: number;
  metadata?: Record<string, unknown>;
};

export type SearchCategoryDef = {
  id: string;
  label: string;
  result_types: SearchResultType[];
};
