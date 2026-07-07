function envFlag(name: string, defaultOn = true): boolean {
  const v = process.env[name];
  if (v === undefined || v === "") return defaultOn;
  const lower = v.toLowerCase();
  return lower === "1" || lower === "true" || lower === "yes";
}

export const featureFlags = {
  vehicleSaleMode: envFlag("FEATURE_VEHICLE_SALE_MODE"),
  newCarInventoryV2: envFlag("FEATURE_NEW_CAR_INVENTORY_V2"),
  wishlistDb: envFlag("FEATURE_WISHLIST_DB"),
  unifiedVehicleApi: envFlag("FEATURE_UNIFIED_VEHICLE_API"),
  partsCompatibility: envFlag("FEATURE_PARTS_COMPATIBILITY"),
  /** Phase F — all default off until operator enables */
  auctionV2: envFlag("FEATURE_AUCTION_V2", false),
  auctionCategories: envFlag("FEATURE_AUCTION_CATEGORIES", false),
  auctionProxyBid: envFlag("FEATURE_AUCTION_PROXY_BID", false),
  auctionAutoBid: envFlag("FEATURE_AUCTION_AUTO_BID", false),
  auctionWatchlist: envFlag("FEATURE_AUCTION_WATCHLIST", false),
  auctionBidHistory: envFlag("FEATURE_AUCTION_BID_HISTORY", false),
  auctionKycGate: envFlag("FEATURE_AUCTION_KYC_GATE", false),
  /** Phase E — broker CRM; all default off */
  brokerCrm: envFlag("FEATURE_BROKER_CRM", false),
  brokerContacts: envFlag("FEATURE_BROKER_CONTACTS", false),
  brokerLeads: envFlag("FEATURE_BROKER_LEADS", false),
  brokerDeals: envFlag("FEATURE_BROKER_DEALS", false),
  brokerVehicleAssign: envFlag("FEATURE_BROKER_VEHICLE_ASSIGN", false),
  brokerTasks: envFlag("FEATURE_BROKER_TASKS", false),
  brokerCommissions: envFlag("FEATURE_BROKER_COMMISSIONS", false),
  brokerWhatsapp: envFlag("FEATURE_BROKER_WHATSAPP", false),
  brokerMarketplaceBridge: envFlag("FEATURE_BROKER_MARKETPLACE_BRIDGE", false),
  /** Phase I — community; all default off */
  communityV2: envFlag("FEATURE_COMMUNITY_V2", false),
  communityProfiles: envFlag("FEATURE_COMMUNITY_PROFILES", false),
  communityBusinessProfiles: envFlag("FEATURE_COMMUNITY_BUSINESS_PROFILES", false),
  communityFeed: envFlag("FEATURE_COMMUNITY_FEED", false),
  communityPosts: envFlag("FEATURE_COMMUNITY_POSTS", false),
  communityFollow: envFlag("FEATURE_COMMUNITY_FOLLOW", false),
  /** Phase I2 — groups + business pages */
  communityGroups: envFlag("FEATURE_COMMUNITY_GROUPS", false),
  communityGroupFeed: envFlag("FEATURE_COMMUNITY_GROUP_FEED", false),
  communityGroupModeration: envFlag("FEATURE_COMMUNITY_GROUP_MODERATION", false),
  communityBusinessPages: envFlag("FEATURE_COMMUNITY_BUSINESS_PAGES", false),
  /** Phase J — Growth CRM; all default off */
  growthV2: envFlag("FEATURE_GROWTH_V2", false),
  growthWorkspaces: envFlag("FEATURE_GROWTH_WORKSPACES", false),
  growthAssets: envFlag("FEATURE_GROWTH_ASSETS", false),
  growthPosters: envFlag("FEATURE_GROWTH_POSTERS", false),
  growthWhatsapp: envFlag("FEATURE_GROWTH_WHATSAPP", false),
  growthLeads: envFlag("FEATURE_GROWTH_LEADS", false),
  /** Phase J4 — lead pipeline, activities, analytics (Growth only) */
  growthLeadPipeline: envFlag("FEATURE_GROWTH_LEAD_PIPELINE", false),
  /** Phase K2 — automotive business directory (reads community_business_profiles) */
  businessDirectoryV2: envFlag("FEATURE_BUSINESS_DIRECTORY_V2", false),
  /** Phase K1 — directory monetization (no payment gateway) */
  directoryMonetizationK1: envFlag("FEATURE_K1_DIRECTORY_MONETIZATION", false),
  /** Phase L1 — WhatsApp provider architecture (stubs only) */
  growthWhatsappProviders: envFlag("FEATURE_GROWTH_WHATSAPP_PROVIDERS", false),
  /** Phase L2 — social scheduler architecture (no external APIs) */
  growthSocialScheduler: envFlag("FEATURE_GROWTH_SOCIAL_SCHEDULER", false),
  /** Phase M0 — investor / founder read-only dashboard */
  founderDashboard: envFlag("FEATURE_M0_FOUNDER_DASHBOARD", false),
  /** Phase M1.0 — unified ecosystem identity context */
  unifiedIdentity: envFlag("FEATURE_M1_UNIFIED_IDENTITY", false),
  /** Phase M2.0 — read-only business hub aggregate API */
  unifiedBusiness: envFlag("FEATURE_M2_UNIFIED_BUSINESS", false),
  /** Phase M3.0 — unified lead router (routing layer only, no CRM moves) */
  leadRouter: envFlag("FEATURE_M3_LEAD_ROUTER", false),
  /** Phase M4.0 — unified notification center (aggregation only) */
  unifiedNotifications: envFlag("FEATURE_M4_NOTIFICATIONS", false),
  /** Phase M5.0 — federated unified search */
  unifiedSearch: envFlag("FEATURE_M5_UNIFIED_SEARCH", false),
  /** Phase N2.1 — billing MVP (mock subscriptions, no payment gateway) */
  billingV2: envFlag("FEATURE_BILLING_V2", false),
} as const;
