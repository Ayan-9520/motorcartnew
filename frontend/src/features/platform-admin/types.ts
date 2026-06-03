import type { AppRole, KycStatus, UserStatus } from "@/types/database";

export type PlatformTicketStatus = "open" | "pending" | "resolved" | "closed";
export type PlatformTicketPriority = "low" | "medium" | "high" | "urgent";
export type PlatformFraudStatus = "open" | "reviewing" | "cleared" | "blocked";

export interface PlatformOverview {
  totalUsers: number;
  activeUsers: number;
  pendingKyc: number;
  pendingDealers: number;
  pendingBusiness: number;
  pendingFinance: number;
  approvedFinance: number;
  loanDisbursedTotal: number;
  openTickets: number;
  fraudOpen: number;
  mrrEstimate: number;
  listingsLive: number;
}

export interface AdminFlowRow {
  id: string;
  title: string;
  from: string;
  stores: string;
  admin: string;
  result: string;
}

export interface AdminFinanceApplicationRow {
  id: string;
  userId: string;
  applicantName: string;
  applicantEmail: string | null;
  bankId: string | null;
  amount: number;
  tenure: number;
  status: string;
  createdAt: string;
}

export interface PendingBusinessAccountRow {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string;
  role: AppRole;
  status: UserStatus;
  approvalStatus: string | null;
  companyName: string | null;
  city: string | null;
  state: string | null;
  kycStatus: KycStatus;
  createdAt: string;
  dealerId: string | null;
  dealerName: string | null;
  dealerVerificationStatus: string | null;
}

export interface AdminUserRow {
  id: string;
  email: string | null;
  fullName: string;
  role: AppRole;
  status: UserStatus;
  kycStatus: KycStatus;
  city: string | null;
  createdAt: string;
}

export interface AdminDealerRow {
  id: string;
  name: string;
  city: string;
  ownerId: string;
  verificationStatus: string;
  subscriptionTier: string;
  isVerified: boolean;
  createdAt: string;
}

export interface KycQueueRow {
  userId: string;
  fullName: string;
  email: string | null;
  kycStatus: KycStatus;
  submittedAt: string;
  role: AppRole;
}

export interface SubscriptionPlanRow {
  code: string;
  name: string;
  priceMonthly: number;
  maxListings: number;
  activeDealers: number;
}

export interface PlatformBanner {
  id: string;
  title: string;
  placement: string;
  imageUrl: string | null;
  linkUrl: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface CmsPageRow {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "archived";
  updatedAt: string;
}

export interface PlatformNotificationRow {
  id: string;
  title: string;
  channel: string;
  audience: string;
  status: string;
  scheduledAt: string | null;
}

export interface SupportTicketRow {
  id: string;
  subject: string;
  status: PlatformTicketStatus;
  priority: PlatformTicketPriority;
  requesterEmail: string | null;
  category: string;
  createdAt: string;
}

export interface FraudAlertRow {
  id: string;
  source: string;
  entityType: string;
  entityId: string | null;
  riskScore: number;
  reason: string;
  status: PlatformFraudStatus;
  createdAt: string;
}

export interface PlatformReportRow {
  id: string;
  reportKey: string;
  title: string;
  periodLabel: string | null;
  createdAt: string;
}

export interface AnalyticsSeriesPoint {
  label: string;
  value: number;
}

export interface PlatformAnalytics {
  signups: AnalyticsSeriesPoint[];
  revenue: AnalyticsSeriesPoint[];
  conversionRate: number;
  churnRate: number;
}

export interface AdminVehicleRow {
  id: string;
  title: string;
  brand: string;
  model: string;
  price: number;
  city: string;
  status: string;
  isFeatured: boolean;
  platformFeatured: boolean;
  dealerName: string | null;
  createdAt: string;
}

export interface AdminAuctionRow {
  id: string;
  title: string;
  status: string;
  isFeatured: boolean;
  currentBid: number;
  reservePrice: number;
  bidCount: number;
  endsAt: string | null;
}

export interface PlatformTransactionRow {
  id: string;
  type: "loan" | "subscription" | "auction" | "parts" | "service";
  reference: string;
  party: string;
  amount: number;
  status: string;
  createdAt: string;
}

export interface RevenueAnalytics extends PlatformAnalytics {
  gmvTotal: number;
  mrr: number;
  loanDisbursed: number;
  subscriptionRevenue: number;
  auctionFees: number;
}
