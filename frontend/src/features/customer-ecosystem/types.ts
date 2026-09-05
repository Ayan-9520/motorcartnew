export type CustomerVehicleSegment = "car" | "bike" | "ev" | "commercial";

export type VehicleDocType = "rc" | "insurance" | "puc" | "loan" | "warranty" | "invoice" | "other";

export type CustomerNotificationType =
  | "emi"
  | "insurance"
  | "service"
  | "auction"
  | "price_drop"
  | "dealer"
  | "ai"
  | "loyalty"
  | "system";

export type CustomerVehicle = {
  id: string;
  brand: string;
  model: string;
  variant?: string;
  year: number;
  fuelType: string;
  transmission: string;
  registrationNumber?: string;
  registrationCity?: string;
  segment: CustomerVehicleSegment;
  ownershipNumber: number;
  purchaseDate?: string;
  odometerKm?: number;
  healthScore?: number;
  resaleEstimate?: number;
  fastagBalance?: number;
  isPrimary: boolean;
  imageUrl: string;
  insuranceStatus: "active" | "expiring" | "expired" | "none";
  insuranceDaysLeft?: number;
  rcStatus: "verified" | "pending" | "missing";
  serviceDueDays?: number;
  emiDueAmount?: number;
  emiDueDate?: string;
  pucDaysLeft?: number;
  loanLender?: string;
  aiScore?: number;
};

export type OwnershipTimelineEvent = {
  id: string;
  date: string;
  title: string;
  description?: string;
  type: "purchase" | "insurance" | "service" | "document" | "finance" | "milestone";
  vehicleLabel?: string;
};

export type InsuranceClaim = {
  id: string;
  vehicleLabel: string;
  insurerName: string;
  claimId: string;
  amount: number;
  status: "settled" | "processing" | "rejected";
  filedAt: string;
};

export type EngagementCampaign = {
  id: string;
  type: "birthday" | "anniversary" | "insurance" | "service" | "upgrade" | "loyalty";
  title: string;
  message: string;
  ctaLabel: string;
  ctaUrl: string;
  scheduledFor?: string;
  icon?: "gift" | "heart" | "shield" | "wrench" | "sparkles" | "award";
};

export type VehicleDocument = {
  id: string;
  vehicleId?: string;
  docType: VehicleDocType;
  title: string;
  documentNumber?: string;
  verified: boolean;
  expiresAt?: string;
  daysUntilExpiry?: number;
};

export type InsuranceWalletEntry = {
  id: string;
  vehicleId?: string;
  vehicleLabel: string;
  insurerName: string;
  policyNumber?: string;
  planType: string;
  idvAmount: number;
  annualPremium: number;
  ncbPercent: number;
  policyEnd: string;
  daysLeft: number;
  claimCount: number;
  status: "active" | "expiring" | "expired";
};

export type ServiceRecord = {
  id: string;
  vehicleId?: string;
  vehicleLabel: string;
  serviceType: string;
  serviceCenter?: string;
  amount?: number;
  servicedAt: string;
  nextDueDate?: string;
};

export type CustomerNotification = {
  id: string;
  type: CustomerNotificationType;
  title: string;
  body?: string;
  actionUrl?: string;
  createdAt: string;
  read: boolean;
};

export type AiInsight = {
  id: string;
  insightKey: string;
  title: string;
  summary: string;
  severity: "info" | "warning" | "success" | "critical";
  actionLabel?: string;
  actionUrl?: string;
  vehicleLabel?: string;
};

export type CustomerPreferences = {
  dob?: string;
  anniversary?: string;
  preferredBrand?: string;
  city?: string;
  state?: string;
  profileCompletion: number;
  loyaltyTier: string;
  rewardPointsBalance: number;
  notifyInsurance?: boolean;
  notifyService?: boolean;
};

export type CustomerEnquirySummary = {
  id: string;
  dealerName: string | null;
  status: string;
  vehicleInterest: string | null;
  createdAt: string;
};

export type CustomerFinanceSummary = {
  id: string;
  status: string;
  loanAmount: number | null;
  bankName: string | null;
  createdAt: string;
};

export type CustomerAvailability = {
  rewardsLedger: boolean;
  insuranceClaims: boolean;
  aiInsights: boolean;
  fastagProvider: boolean;
  savedSearches: boolean;
  documentScan: boolean;
};

export type DashboardWidget = {
  key: string;
  label: string;
  value: string | number;
  sublabel?: string;
  progress?: number;
  trend?: "up" | "down" | "neutral";
  href?: string;
  variant?: "default" | "warning" | "success" | "premium";
};

export type CustomerEcosystemSnapshot = {
  vehicles: CustomerVehicle[];
  documents: VehicleDocument[];
  insurance: InsuranceWalletEntry[];
  insuranceClaims: InsuranceClaim[];
  serviceRecords: ServiceRecord[];
  notifications: CustomerNotification[];
  insights: AiInsight[];
  preferences: CustomerPreferences;
  widgets: DashboardWidget[];
  timeline: OwnershipTimelineEvent[];
  campaigns: EngagementCampaign[];
  unreadNotifications: number;
  enquiries: CustomerEnquirySummary[];
  wishlistVehicleIds: string[];
  financeApplications: CustomerFinanceSummary[];
  availability: CustomerAvailability;
};
