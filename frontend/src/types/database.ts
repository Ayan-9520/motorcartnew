/**
 * Motorcart.in — Supabase database types (Phase 2)
 * Mirror of public schema — regenerate with `supabase gen types` when CLI linked
 */

export type AppRole =
  | "customer"
  | "dealer"
  | "used_car_dealer"
  | "new_car_dealer"
  | "bike_dealer"
  | "truck_dealer"
  | "dsa_agent"
  | "bank_nbfc"
  | "finance_manager"
  | "service_center"
  | "service_technician"
  | "parts_seller"
  | "admin"
  | "super_admin"
  | "auction_partner"
  | "broker"
  /** Legacy signup / metadata aliases — normalized in workspace-role */
  | "service_partner"
  | "preowned_dealer";

export type UserStatus = "active" | "suspended" | "pending_verification" | "closed";

export type KycStatus = "pending" | "submitted" | "verified" | "rejected";
export type VehicleStatus = "draft" | "available" | "reserved" | "sold";
export type AuctionStatus = "upcoming" | "live" | "ended" | "cancelled";
export type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "lost";
export type FinanceStatus = "draft" | "submitted" | "processing" | "approved" | "rejected" | "disbursed";
export type BookingStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";

export interface DbUser {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string;
  avatar_url: string | null;
  role: AppRole;
  status?: UserStatus;
  approval_status?: string | null;
  kyc_status: KycStatus;
  kyc_data: Record<string, unknown>;
  company_name: string | null;
  city: string | null;
  state: string | null;
  is_verified: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbDealer {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  dealer_type: AppRole;
  rating: number;
  review_count: number;
  address: string | null;
  city: string;
  state: string;
  pincode: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  is_verified: boolean;
  specialties: string[];
  subscription_tier: string;
  created_at: string;
  updated_at: string;
}

export interface DbVehicle {
  id: string;
  dealer_id: string | null;
  seller_id: string | null;
  slug: string;
  title: string;
  brand: string;
  model: string;
  variant: string | null;
  year: number;
  price: number;
  original_price: number | null;
  fuel_type: string;
  transmission: string;
  body_type: string;
  category: string;
  kms_driven: number;
  owners: number;
  color: string | null;
  location: string | null;
  city: string;
  state: string;
  images: string[];
  features: string[];
  description: string | null;
  is_certified: boolean;
  is_featured: boolean;
  condition: string;
  sale_mode?: string | null;
  status: VehicleStatus;
  ai_price_score: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbAuction {
  id: string;
  vehicle_id: string;
  organizer_id: string;
  title: string;
  images: string[];
  starting_bid: number;
  current_bid: number | null;
  reserve_price: number | null;
  bid_increment: number;
  bid_count: number;
  auction_type: string;
  starts_at: string;
  ends_at: string;
  status: AuctionStatus;
  winner_id: string | null;
  slug?: string | null;
  location?: string | null;
  is_featured?: boolean;
  viewer_count?: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbVehicleImage {
  id: string;
  vehicle_id: string;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
}

export interface DbVehicleSpec {
  id: string;
  vehicle_id: string;
  engine: string | null;
  mileage: string | null;
  power: string | null;
  torque: string | null;
  seating_capacity: number | null;
  airbags: number | null;
  abs: boolean | null;
  infotainment: string | null;
  boot_space: string | null;
  extras: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbLeadCall {
  id: string;
  lead_id: string;
  dealer_id: string;
  called_by: string | null;
  direction: string;
  duration_seconds: number | null;
  outcome: string | null;
  notes: string | null;
  created_at: string;
}

export interface DbCrmTask {
  id: string;
  dealer_id: string;
  lead_id: string | null;
  assigned_to: string | null;
  title: string;
  description: string | null;
  due_at: string | null;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

export interface DbAnalytics {
  id: string;
  user_id: string | null;
  dealer_id: string | null;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, unknown>;
  session_id: string | null;
  created_at: string;
}

export interface DbInventoryUpload {
  id: string;
  dealer_id: string;
  uploaded_by: string;
  file_url: string;
  file_name: string | null;
  status: string;
  total_rows: number;
  success_rows: number;
  failed_rows: number;
  error_log: unknown[];
  created_at: string;
  completed_at: string | null;
}

export interface DbBid {
  id: string;
  auction_id: string;
  bidder_id: string;
  amount: number;
  is_auto_bid: boolean;
  created_at: string;
}

export interface DbBank {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  bank_type: string;
  interest_rate_min: number;
  interest_rate_max: number;
  max_tenure_months: number;
  processing_fee: string | null;
  max_loan_amount: number;
  features: string[];
  is_active: boolean;
  is_featured: boolean;
  ranking_score?: number;
  min_cibil?: number;
  short_code?: string;
  created_at: string;
  updated_at: string;
}

export interface DbFinanceApplication {
  id: string;
  user_id: string;
  vehicle_id: string | null;
  bank_id: string | null;
  dsa_agent_id: string | null;
  loan_amount: number;
  tenure_months: number;
  interest_rate: number | null;
  emi_amount: number | null;
  status: FinanceStatus;
  ai_eligibility_score: number | null;
  approval_probability?: number | null;
  cibil_score?: number | null;
  monthly_income?: number | null;
  employment_type?: string | null;
  application_type?: string;
  applicant_metadata?: Record<string, unknown>;
  documents: unknown[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbPart {
  id: string;
  seller_id: string;
  name: string;
  slug: string;
  category: string;
  brand: string | null;
  price: number;
  original_price: number | null;
  stock: number;
  rating: number;
  review_count: number;
  images: string[];
  compatibility: string[];
  is_featured: boolean;
  is_active: boolean;
  description?: string | null;
  sku?: string | null;
  gst_rate?: number;
  wholesale_price?: number | null;
  bulk_min_qty?: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbServiceCenter {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  city: string;
  state: string;
  pincode: string | null;
  phone: string | null;
  rating: number;
  review_count: number;
  services_offered: string[];
  is_verified: boolean;
  images: string[];
  is_active?: boolean;
  lat?: number | null;
  lng?: number | null;
  pickup_drop_available?: boolean;
  slot_interval_minutes?: number;
  created_at: string;
  updated_at: string;
}

export interface DbService {
  id: string;
  service_center_id: string;
  name: string;
  slug: string;
  service_type: string;
  description: string | null;
  price_from: number;
  price_to: number | null;
  duration_minutes: number | null;
  is_doorstep: boolean;
  is_active: boolean;
  images: string[];
  created_at: string;
  updated_at: string;
}

export interface DbBooking {
  id: string;
  user_id: string;
  service_id: string;
  service_center_id: string;
  vehicle_details: Record<string, unknown>;
  scheduled_at: string;
  status: BookingStatus;
  total_amount: number | null;
  otp_verified: boolean;
  notes: string | null;
  mechanic_id?: string | null;
  pickup_address?: string | null;
  drop_address?: string | null;
  payment_status?: string;
  payment_amount?: number | null;
  tracking_step?: string;
  otp_code?: string | null;
  otp_expires_at?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbLead {
  id: string;
  dealer_id: string;
  assigned_to: string | null;
  customer_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  source: string;
  vehicle_id: string | null;
  vehicle_interest: string | null;
  status: LeadStatus;
  ai_score: number | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbConversation {
  id: string;
  lead_id: string | null;
  customer_id: string | null;
  dealer_id: string | null;
  channel: string;
  subject: string | null;
  messages: unknown[];
  is_resolved: boolean;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DbReview {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  rating: number;
  title: string | null;
  content: string | null;
  pros: string[];
  cons: string[];
  is_verified_purchase: boolean;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      users: { Row: DbUser; Insert: Partial<DbUser> & { id: string }; Update: Partial<DbUser> };
      dealers: { Row: DbDealer; Insert: Partial<DbDealer>; Update: Partial<DbDealer> };
      vehicles: { Row: DbVehicle; Insert: Partial<DbVehicle>; Update: Partial<DbVehicle> };
      vehicle_images: { Row: DbVehicleImage; Insert: Partial<DbVehicleImage>; Update: Partial<DbVehicleImage> };
      vehicle_specs: { Row: DbVehicleSpec; Insert: Partial<DbVehicleSpec>; Update: Partial<DbVehicleSpec> };
      auctions: { Row: DbAuction; Insert: Partial<DbAuction>; Update: Partial<DbAuction> };
      bids: { Row: DbBid; Insert: Partial<DbBid>; Update: Partial<DbBid> };
      banks: { Row: DbBank; Insert: Partial<DbBank>; Update: Partial<DbBank> };
      finance_applications: { Row: DbFinanceApplication; Insert: Partial<DbFinanceApplication>; Update: Partial<DbFinanceApplication> };
      parts: { Row: DbPart; Insert: Partial<DbPart>; Update: Partial<DbPart> };
      service_centers: { Row: DbServiceCenter; Insert: Partial<DbServiceCenter>; Update: Partial<DbServiceCenter> };
      services: { Row: DbService; Insert: Partial<DbService>; Update: Partial<DbService> };
      bookings: { Row: DbBooking; Insert: Partial<DbBooking>; Update: Partial<DbBooking> };
      leads: { Row: DbLead; Insert: Partial<DbLead>; Update: Partial<DbLead> };
      lead_calls: { Row: DbLeadCall; Insert: Partial<DbLeadCall>; Update: Partial<DbLeadCall> };
      crm_tasks: { Row: DbCrmTask; Insert: Partial<DbCrmTask>; Update: Partial<DbCrmTask> };
      conversations: { Row: DbConversation; Insert: Partial<DbConversation>; Update: Partial<DbConversation> };
      notifications: { Row: DbNotification; Insert: Partial<DbNotification>; Update: Partial<DbNotification> };
      reviews: { Row: DbReview; Insert: Partial<DbReview>; Update: Partial<DbReview> };
      analytics: { Row: DbAnalytics; Insert: Partial<DbAnalytics>; Update: Partial<DbAnalytics> };
      inventory_uploads: { Row: DbInventoryUpload; Insert: Partial<DbInventoryUpload>; Update: Partial<DbInventoryUpload> };
    };
    Functions: {
      place_auction_bid: {
        Args: { p_auction_id: string; p_amount: number; p_is_auto_bid?: boolean };
        Returns: Record<string, unknown>;
      };
      submit_finance_application: {
        Args: Record<string, unknown>;
        Returns: Record<string, unknown>;
      };
      create_part_order: {
        Args: Record<string, unknown>;
        Returns: Record<string, unknown>;
      };
      verify_booking_otp: {
        Args: { p_booking_id: string; p_otp: string };
        Returns: Record<string, unknown>;
      };
    };
  };
}
