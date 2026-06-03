import type { AppRole, KycStatus, UserStatus } from "@/types/database";

export type UserRole = AppRole;

export interface User {
  id: string;
  email: string;
  phone?: string;
  fullName: string;
  avatarUrl?: string;
  role: UserRole;
  /** From `dealers.dealer_type` — used when `role` is generic `dealer`. */
  dealerType?: UserRole;
  /** From signup metadata — e.g. `new_car_showroom`. */
  businessCategory?: string;
  accountStatus: UserStatus;
  approvalStatus?: string;
  kycStatus: KycStatus;
  isVerified: boolean;
  city?: string;
  state?: string;
  companyName?: string;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  slug: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  emi?: number;
  fuelType: string;
  transmission: string;
  kms: number;
  location: string;
  image: string;
  dealerName: string;
  isVerified: boolean;
  isFeatured: boolean;
  category: string;
  aiScore?: number;
}

export interface AuctionItem {
  id: string;
  title: string;
  image: string;
  currentBid: number;
  startingBid: number;
  bidCount: number;
  endsAt: string;
  location: string;
  status: "live" | "upcoming" | "ended";
}

export interface LoanProduct {
  id: string;
  bank_name: string;
  logo_url: string;
  interest_rate_min: number;
  interest_rate_max: number;
  tenure_max_months: number;
  processing_fee: string;
  max_loan_amount: number;
  features: string[];
  is_featured: boolean;
}

export interface AutoPart {
  id: string;
  slug: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  stock: number;
  seller: string;
  sellerRating?: number;
  delivery?: string;
  image: string;
  compatible?: string[];
}

export interface DashboardStats {
  label: string;
  value: string;
  change?: string;
  trend?: "up" | "down";
}
