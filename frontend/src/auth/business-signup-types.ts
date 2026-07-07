import type { AppRole } from "@/types/database";

export type BusinessCategory =
  | "multi_brand"
  | "single_brand"
  | "preowned_lot"
  | "new_car_showroom"
  | "parts_wholesale"
  | "service_garage"
  | "dsa_finance"
  | "vehicle_broker"
  | "other";

export type BusinessSignupForm = {
  role: AppRole;
  ownerName: string;
  email: string;
  password: string;
  mobile: string;
  companyName: string;
  gst: string;
  city: string;
  state: string;
  businessCategory: BusinessCategory;
  /** Human label for business type (e.g. "Franchise dealer") */
  businessType: string;
  /** File names selected in UI — stored in metadata until Supabase Storage upload */
  documentNames?: string[];
};
