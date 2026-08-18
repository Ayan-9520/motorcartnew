import type { VehicleStatus } from "@/types/database";
import type { VehicleSaleMode } from "@/lib/sale-mode";

export type VehicleCategory =
  | "new-cars"
  | "used-cars"
  | "bikes"
  | "trucks"
  | "buses"
  | "ev";

export type VehicleSortOption =
  | "newest"
  | "price-asc"
  | "price-desc"
  | "year-desc"
  | "kms-asc"
  | "ai-score";

export interface VehicleSpecs {
  engine?: string;
  power?: string;
  torque?: string;
  mileage?: string;
  seating?: string;
  bootSpace?: string;
  safety?: string[];
  comfort?: string[];
  [key: string]: string | string[] | undefined;
}

export type FairPriceLabel = "great-deal" | "fair-price" | "high-price";

export interface VehicleMetadata {
  videos?: string[];
  viewer360?: string[];
  specifications?: VehicleSpecs;
  discountPercent?: number;
  emiRate?: number;
  registrationYear?: number;
  insuranceValid?: string;
  rto?: string;
  /** New car */
  onRoadPrice?: number;
  exShowroomPrice?: number;
  waitingPeriod?: string;
  rating?: number;
  has360?: boolean;
  brochureUrl?: string;
  offerTag?: string;
  isUpcoming?: boolean;
  isLatestLaunch?: boolean;
  /** Pre-owned */
  inspectionScore?: number;
  fairPriceLabel?: FairPriceLabel;
  certificationProgram?: string;
  trustBadges?: string[];
  warrantyIncluded?: boolean;
  returnPolicyDays?: number;
  serviceHistoryAvailable?: boolean;
  rcVerified?: boolean;
  insuranceActive?: boolean;
  loanPreApproved?: boolean;
}

export interface VehicleListing {
  id: string;
  slug: string;
  title: string;
  brand: string;
  model: string;
  variant?: string;
  year: number;
  price: number;
  originalPrice?: number;
  fuelType: string;
  transmission: string;
  bodyType: string;
  category: VehicleCategory;
  kmsDriven: number;
  owners: number;
  color?: string;
  city: string;
  state: string;
  location: string;
  images: string[];
  features: string[];
  description?: string;
  isCertified: boolean;
  isFeatured: boolean;
  condition: "new" | "used";
  status: VehicleStatus;
  aiPriceScore?: number;
  dealerId?: string;
  dealerName: string;
  dealerSlug?: string;
  dealerPhone?: string;
  dealerRating?: number;
  dealerVerified?: boolean;
  /** Phase B — used vehicle sale mode */
  saleMode?: VehicleSaleMode;
  metadata: VehicleMetadata;
  createdAt: string;
}

export interface VehicleFilters {
  category?: VehicleCategory;
  /** Hub slug for auto / equipment (not in VehicleCategory enum) */
  hubCategory?: "auto" | "equipment";
  condition?: "new" | "used";
  brand?: string;
  model?: string;
  fuel?: string;
  transmission?: string;
  priceMin?: number;
  priceMax?: number;
  yearMin?: number;
  yearMax?: number;
  kmsMax?: number;
  owners?: number;
  city?: string;
  color?: string;
  bodyType?: string;
  /** Max monthly EMI (₹) */
  emiMax?: number;
  /** Used cars — sale mode filter */
  saleMode?: VehicleSaleMode;
  q?: string;
}

export interface VehicleSearchResult {
  vehicles: VehicleListing[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TestDriveBooking {
  vehicleId: string;
  name: string;
  phone: string;
  email?: string;
  preferredDate: string;
  preferredTime: string;
  message?: string;
}

export interface VehicleEnquiry {
  vehicleId: string;
  vehicleTitle: string;
  vehicleSlug?: string;
  dealerId?: string;
  dealerSlug?: string;
  name: string;
  phone: string;
  email?: string;
  message?: string;
  location?: string;
  category?: string;
  source?: string;
  consent?: boolean;
  preferredContact?: "phone" | "email" | "whatsapp";
}
