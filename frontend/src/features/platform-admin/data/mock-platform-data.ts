import type {
  AdminAuctionRow,
  AdminDealerRow,
  AdminUserRow,
  AdminVehicleRow,
  AnalyticsSeriesPoint,
  CmsPageRow,
  FraudAlertRow,
  KycQueueRow,
  PlatformAnalytics,
  PlatformBanner,
  PlatformNotificationRow,
  PlatformOverview,
  PlatformReportRow,
  PlatformTransactionRow,
  RevenueAnalytics,
  SubscriptionPlanRow,
  SupportTicketRow,
} from "../types";

export const MOCK_OVERVIEW: PlatformOverview = {
  totalUsers: 48210,
  activeUsers: 45120,
  pendingKyc: 128,
  pendingDealers: 34,
  pendingBusiness: 12,
  pendingFinance: 8,
  approvedFinance: 42,
  loanDisbursedTotal: 12400000,
  openTickets: 19,
  fraudOpen: 7,
  mrrEstimate: 2840000,
  listingsLive: 12450,
};

export const MOCK_USERS: AdminUserRow[] = [
  {
    id: "u-1",
    email: "priya@example.com",
    fullName: "Priya Sharma",
    role: "customer",
    status: "active",
    kycStatus: "verified",
    city: "Mumbai",
    createdAt: new Date(Date.now() - 86400000 * 120).toISOString(),
  },
  {
    id: "u-2",
    email: "dealer@velocity.in",
    fullName: "Velocity Motors",
    role: "used_car_dealer",
    status: "active",
    kycStatus: "submitted",
    city: "Delhi",
    createdAt: new Date(Date.now() - 86400000 * 45).toISOString(),
  },
  {
    id: "u-3",
    email: "blocked@test.io",
    fullName: "Test Blocked",
    role: "customer",
    status: "suspended",
    kycStatus: "rejected",
    city: "Pune",
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
];

export const MOCK_DEALERS: AdminDealerRow[] = [
  {
    id: "d-1",
    name: "Velocity Motors",
    city: "Delhi",
    ownerId: "u-2",
    verificationStatus: "documents_submitted",
    subscriptionTier: "pro",
    isVerified: false,
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: "d-2",
    name: "Coastal Cars",
    city: "Chennai",
    ownerId: "u-4",
    verificationStatus: "pending",
    subscriptionTier: "free",
    isVerified: false,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

export const MOCK_KYC: KycQueueRow[] = [
  {
    userId: "u-2",
    fullName: "Velocity Motors",
    email: "dealer@velocity.in",
    kycStatus: "submitted",
    submittedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    role: "used_car_dealer",
  },
];

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const signups: AnalyticsSeriesPoint[] = months.map((label, i) => ({
  label,
  value: 3200 + i * 420 + Math.floor(Math.random() * 200),
}));

export const MOCK_ANALYTICS: PlatformAnalytics = {
  signups,
  revenue: months.map((label, i) => ({ label, value: 18 + i * 2.4 })),
  conversionRate: 4.2,
  churnRate: 1.1,
};

export const MOCK_PLANS: SubscriptionPlanRow[] = [
  { code: "free", name: "Free", priceMonthly: 0, maxListings: 10, activeDealers: 820 },
  { code: "pro", name: "Pro", priceMonthly: 4999, maxListings: 100, activeDealers: 412 },
  { code: "enterprise", name: "Enterprise", priceMonthly: 19999, maxListings: 500, activeDealers: 48 },
];

export const MOCK_BANNERS: PlatformBanner[] = [
  {
    id: "b-1",
    title: "Summer finance fest",
    placement: "home_hero",
    imageUrl: null,
    linkUrl: "/finance",
    isActive: true,
    sortOrder: 0,
  },
];

export const MOCK_CMS: CmsPageRow[] = [
  { id: "c-1", slug: "about", title: "About Motorcart", status: "published", updatedAt: new Date().toISOString() },
  { id: "c-2", slug: "terms", title: "Terms of Service", status: "published", updatedAt: new Date().toISOString() },
];

export const MOCK_NOTIFICATIONS: PlatformNotificationRow[] = [
  {
    id: "n-1",
    title: "New auction lots this week",
    channel: "in_app",
    audience: "all",
    status: "sent",
    scheduledAt: null,
  },
];

export const MOCK_TICKETS: SupportTicketRow[] = [
  {
    id: "t-1",
    subject: "Dealer verification delay",
    status: "open",
    priority: "high",
    requesterEmail: "dealer@velocity.in",
    category: "verification",
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: "t-2",
    subject: "Refund for cancelled booking",
    status: "pending",
    priority: "medium",
    requesterEmail: "user@example.com",
    category: "billing",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const MOCK_FRAUD: FraudAlertRow[] = [
  {
    id: "f-1",
    source: "auctionbot",
    entityType: "bid",
    entityId: "bid-8821",
    riskScore: 87,
    reason: "Velocity bidding pattern — possible shill",
    status: "open",
    createdAt: new Date().toISOString(),
  },
];

export const MOCK_REPORTS: PlatformReportRow[] = [
  {
    id: "r-1",
    reportKey: "monthly_gmv",
    title: "Monthly GMV",
    periodLabel: "May 2026",
    createdAt: new Date().toISOString(),
  },
];

export const MOCK_VEHICLES: AdminVehicleRow[] = [
  {
    id: "v-1",
    title: "2022 Hyundai Creta SX",
    brand: "Hyundai",
    model: "Creta",
    price: 1280000,
    city: "Mumbai",
    status: "available",
    isFeatured: false,
    platformFeatured: true,
    dealerName: "Velocity Motors",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "v-2",
    title: "2020 Maruti Swift VDI",
    brand: "Maruti",
    model: "Swift",
    price: 520000,
    city: "Delhi",
    status: "draft",
    isFeatured: false,
    platformFeatured: false,
    dealerName: "Coastal Cars",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "v-3",
    title: "2019 Honda City ZX",
    brand: "Honda",
    model: "City",
    price: 890000,
    city: "Bengaluru",
    status: "available",
    isFeatured: true,
    platformFeatured: false,
    dealerName: "Prime Wheels",
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

export const MOCK_AUCTIONS: AdminAuctionRow[] = [
  {
    id: "a-1",
    title: "Fleet disposal — 12 sedans",
    status: "upcoming",
    isFeatured: false,
    currentBid: 0,
    reservePrice: 4500000,
    bidCount: 0,
    endsAt: new Date(Date.now() + 86400000 * 2).toISOString(),
  },
  {
    id: "a-2",
    title: "Damaged stock — insurance lot",
    status: "live",
    isFeatured: true,
    currentBid: 2100000,
    reservePrice: 2500000,
    bidCount: 14,
    endsAt: new Date(Date.now() + 3600000 * 6).toISOString(),
  },
];

export const MOCK_TRANSACTIONS: PlatformTransactionRow[] = [
  {
    id: "tx-1",
    type: "loan",
    reference: "FIN-8821",
    party: "HDFC · Rahul S.",
    amount: 850000,
    status: "disbursed",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "tx-2",
    type: "subscription",
    reference: "SUB-pro-441",
    party: "Velocity Motors",
    amount: 4999,
    status: "paid",
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: "tx-3",
    type: "auction",
    reference: "AUC-2201",
    party: "Buyer #882",
    amount: 125000,
    status: "settled",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const MOCK_REVENUE: RevenueAnalytics = {
  ...MOCK_ANALYTICS,
  gmvTotal: 42800000,
  mrr: MOCK_OVERVIEW.mrrEstimate,
  loanDisbursed: 12400000,
  subscriptionRevenue: 2840000,
  auctionFees: 890000,
};
