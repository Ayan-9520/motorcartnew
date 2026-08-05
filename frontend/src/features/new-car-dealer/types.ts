export type NcdStockStatus = "available" | "booked" | "transit" | "upcoming" | "delivered";
export type NcdStockHealth = "fast_moving" | "slow_moving" | "dead_stock";
export type NcdLeadStage =
  | "new"
  | "contacted"
  | "interested"
  | "test_drive"
  | "negotiation"
  | "finance"
  | "booking"
  | "delivered"
  | "lost";

export type NcdBookingStatus =
  | "pending"
  | "finance_processing"
  | "approved"
  | "vehicle_allocated"
  | "invoiced"
  | "delivered";

export type NcdShowroom = {
  id: string;
  name: string;
  brand: string;
  city: string;
  logoUrl?: string;
  status: "live" | "pending" | "suspended";
  monthlyTarget: number;
  monthlyAchieved: number;
  carsSoldMtd: number;
};

export type NcdMetric = {
  key: string;
  label: string;
  value: number | string;
  sublabel?: string;
  trend?: number;
  trendLabel?: string;
  href?: string;
  variant?: "default" | "success" | "warning" | "premium";
};

export type NcdInventoryItem = {
  id: string;
  /** Public marketplace vehicle row id when synced */
  vehicleId?: string;
  /** Showroom inventory row id in new_car_inventory */
  ncdInventoryId?: string;
  inventorySource?: "vehicle" | "ncd";
  brand: string;
  model: string;
  variant: string;
  fuelType: string;
  transmission: string;
  exShowroomPrice: number;
  onRoadPrice: number;
  discountAmount: number;
  stockStatus: NcdStockStatus;
  stockHealth: NcdStockHealth;
  colors: string[];
  expectedDeliveryDays?: number;
  waitingPeriodDays?: number;
  brochureUrl?: string;
  offers?: { title: string; amount?: number; validUntil?: string }[];
  mileage?: string;
  seating?: number;
  imageUrl: string;
};

export type NcdLead = {
  id: string;
  customerName: string;
  phone: string;
  email?: string;
  city: string;
  source: string;
  stage: NcdLeadStage;
  preferredBrand?: string;
  preferredModel?: string;
  budgetMax?: number;
  tradeIn?: string;
  financeInterest: boolean;
  insuranceInterest: boolean;
  assignedTo?: string;
  score: number;
  createdAt: string;
};

export type NcdLeadDetail = NcdLead & {
  followups: { id: string; note: string; channel: string; at: string }[];
  whatsappCount: number;
};

export type NcdBooking = {
  id: string;
  customerName: string;
  vehicleLabel: string;
  tokenAmount: number;
  bookingAmount: number;
  status: NcdBookingStatus;
  bookedAt: string;
};

export type NcdDelivery = {
  id: string;
  customerName: string;
  vehicleLabel: string;
  pdiComplete: boolean;
  rcStatus: string;
  deliveryDate?: string;
};

export type NcdStaff = {
  id: string;
  fullName: string;
  role: string;
  monthlyTarget: number;
  carsSoldMtd: number;
  leadsAssigned: number;
};

export type NcdAiInsight = {
  id: string;
  title: string;
  summary: string;
  severity: "info" | "warning" | "success";
  actionLabel?: string;
  actionUrl?: string;
};

export type NewCarDealerSnapshot = {
  showroom: NcdShowroom;
  metrics: NcdMetric[];
  hotLeadsCount: number;
  inventory: NcdInventoryItem[];
  leads: NcdLead[];
  bookings: NcdBooking[];
  deliveries: NcdDelivery[];
  staff: NcdStaff[];
  insights: NcdAiInsight[];
  salesChart: { month: string; units: number; revenue: number }[];
  leadSourceChart: { source: string; count: number }[];
};
