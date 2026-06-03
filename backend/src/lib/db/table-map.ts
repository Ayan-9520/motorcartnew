import { prisma } from "@/lib/prisma";

/** Maps frontend Supabase table names → Prisma delegates */
export const tableDelegates: Record<string, keyof typeof prisma> = {
  users: "user",
  dealers: "dealer",
  vehicles: "vehicle",
  vehicle_specs: "vehicleSpec",
  wishlists: "wishlist",
  leads: "lead",
  lead_calls: "leadCall",
  dealer_members: "dealerMember",
  dealer_storefronts: "dealerStorefront",
  dealer_documents: "dealerDocument",
  dealer_auction_entries: "dealerAuctionEntry",
  dealer_lead_notes: "dealerLeadNote",
  crm_tasks: "crmTask",
  auctions: "auction",
  bids: "auctionBid",
  auction_messages: "auctionMessage",
  auction_notifications: "auctionNotification",
  banks: "bank",
  finance_applications: "financeApplication",
  finance_leads: "financeLead",
  finance_commissions: "financeCommission",
  finance_verifications: "financeVerification",
  finance_status_history: "financeStatusHistory",
  bank_integration_configs: "bankIntegrationConfig",
  dsa_agents: "dsaAgent",
  insurance_applications: "insuranceApplication",
  insurance_partners: "insurancePartner",
  insurance_quotes: "insuranceQuote",
  parts: "part",
  part_products: "partProduct",
  part_orders: "partOrder",
  part_order_items: "partOrderItem",
  parts_supplier_profiles: "partsSupplierProfile",
  services: "serviceCatalog",
  service_centers: "serviceCenter",
  bookings: "booking",
  service_bookings: "serviceBooking",
  service_job_cards: "serviceJobCard",
  service_customers_crm: "serviceCustomersCrm",
  service_ai_logs: "serviceAiLog",
  social_posts: "socialPost",
  community_posts: "communityPost",
  community_groups: "communityGroup",
  post_hashtags: "postHashtag",
  post_likes: "postLike",
  post_comments: "postComment",
  post_shares: "postShare",
  poll_votes: "pollVote",
  user_follows: "userFollow",
  community_moderation_flags: "communityModerationFlag",
  customer_vehicles: "customerVehicle",
  vehicle_documents: "vehicleDocument",
  insurance_wallet: "insuranceWallet",
  service_records: "serviceRecord",
  customer_preferences: "customerPreference",
  ai_insights: "aiInsight",
  notification_logs: "notificationLog",
  engagement_campaigns: "engagementCampaign",
  scheduled_reminders: "scheduledReminder",
  new_car_inventory: "newCarInventory",
  dealer_leads: "dealerLead",
  inventory_uploads: "inventoryUpload",
  notifications: "notification",
  reviews: "review",
  activity_logs: "activityLog",
  device_sessions: "deviceSession",
  cms_banners: "cmsBanner",
  platform_banners: "platformBanner",
  platform_cms_pages: "platformCmsPage",
  platform_notifications: "platformNotification",
  platform_fraud_alerts: "platformFraudAlert",
  platform_report_snapshots: "platformReportSnapshot",
  subscription_plans: "subscriptionPlan",
  support_tickets: "supportTicket",
  uploaded_files: "uploadedFile",
  analytics: "activityLog",
};

/** Only these tables have `deleted_at` in Prisma — do not filter others. */
const TABLES_WITH_SOFT_DELETE = new Set([
  "users",
  "dealers",
  "vehicles",
  "part_products",
  "community_posts",
  "parts",
]);

export function tableHasSoftDelete(table: string) {
  return TABLES_WITH_SOFT_DELETE.has(table);
}

export function getDelegate(table: string) {
  const key = tableDelegates[table];
  if (!key) return null;
  return (prisma as Record<string, unknown>)[key as string] as {
    findMany: (args?: unknown) => Promise<unknown[]>;
    findFirst: (args?: unknown) => Promise<unknown | null>;
    create: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
    upsert: (args: unknown) => Promise<unknown>;
    deleteMany: (args?: unknown) => Promise<unknown>;
    count: (args?: unknown) => Promise<number>;
  };
}

export function toSnakeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const snake = k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
    if (v instanceof Date) out[snake] = v.toISOString();
    else if (typeof v === "bigint") out[snake] = Number(v);
    else out[snake] = v;
  }
  return out;
}
