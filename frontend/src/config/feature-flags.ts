function viteFlag(name: string, defaultOn = true): boolean {
  const v = import.meta.env[name] as string | undefined;
  if (v === undefined || v === "") return defaultOn;
  const lower = String(v).toLowerCase();
  return lower === "1" || lower === "true" || lower === "yes";
}

export const featureFlags = {
  vehicleSaleMode: viteFlag("VITE_FEATURE_VEHICLE_SALE_MODE"),
  newCarInventoryV2: viteFlag("VITE_FEATURE_NEW_CAR_INVENTORY_V2"),
  wishlistDb: viteFlag("VITE_FEATURE_WISHLIST_DB"),
  unifiedVehicleApi: viteFlag("VITE_FEATURE_UNIFIED_VEHICLE_API"),
  partsCompatibility: viteFlag("VITE_FEATURE_PARTS_COMPATIBILITY"),
  /** Phase F — default off */
  auctionV2: viteFlag("VITE_FEATURE_AUCTION_V2", false),
  auctionCategories: viteFlag("VITE_FEATURE_AUCTION_CATEGORIES", false),
  auctionProxyBid: viteFlag("VITE_FEATURE_AUCTION_PROXY_BID", false),
  auctionAutoBid: viteFlag("VITE_FEATURE_AUCTION_AUTO_BID", false),
  auctionWatchlist: viteFlag("VITE_FEATURE_AUCTION_WATCHLIST", false),
  auctionBidHistory: viteFlag("VITE_FEATURE_AUCTION_BID_HISTORY", false),
  auctionKycGate: viteFlag("VITE_FEATURE_AUCTION_KYC_GATE", false),
  /** Phase E — default off */
  brokerCrm: viteFlag("VITE_FEATURE_BROKER_CRM", false),
  brokerContacts: viteFlag("VITE_FEATURE_BROKER_CONTACTS", false),
  brokerLeads: viteFlag("VITE_FEATURE_BROKER_LEADS", false),
  brokerDeals: viteFlag("VITE_FEATURE_BROKER_DEALS", false),
  brokerVehicleAssign: viteFlag("VITE_FEATURE_BROKER_VEHICLE_ASSIGN", false),
  brokerTasks: viteFlag("VITE_FEATURE_BROKER_TASKS", false),
  brokerCommissions: viteFlag("VITE_FEATURE_BROKER_COMMISSIONS", false),
  brokerWhatsapp: viteFlag("VITE_FEATURE_BROKER_WHATSAPP", false),
  brokerMarketplaceBridge: viteFlag("VITE_FEATURE_BROKER_MARKETPLACE_BRIDGE", false),
  /** Phase I — default off */
  communityV2: viteFlag("VITE_FEATURE_COMMUNITY_V2", false),
  communityProfiles: viteFlag("VITE_FEATURE_COMMUNITY_PROFILES", false),
  communityBusinessProfiles: viteFlag("VITE_FEATURE_COMMUNITY_BUSINESS_PROFILES", false),
  communityFeed: viteFlag("VITE_FEATURE_COMMUNITY_FEED", false),
  communityPosts: viteFlag("VITE_FEATURE_COMMUNITY_POSTS", false),
  communityFollow: viteFlag("VITE_FEATURE_COMMUNITY_FOLLOW", false),
  communityGroups: viteFlag("VITE_FEATURE_COMMUNITY_GROUPS", false),
  communityGroupFeed: viteFlag("VITE_FEATURE_COMMUNITY_GROUP_FEED", false),
  communityGroupModeration: viteFlag("VITE_FEATURE_COMMUNITY_GROUP_MODERATION", false),
  communityBusinessPages: viteFlag("VITE_FEATURE_COMMUNITY_BUSINESS_PAGES", false),
  /** Phase J — Growth CRM; all default off */
  growthV2: viteFlag("VITE_FEATURE_GROWTH_V2", false),
  growthWorkspaces: viteFlag("VITE_FEATURE_GROWTH_WORKSPACES", false),
  growthAssets: viteFlag("VITE_FEATURE_GROWTH_ASSETS", false),
  growthPosters: viteFlag("VITE_FEATURE_GROWTH_POSTERS", false),
  growthWhatsapp: viteFlag("VITE_FEATURE_GROWTH_WHATSAPP", false),
  growthLeads: viteFlag("VITE_FEATURE_GROWTH_LEADS", false),
  growthLeadPipeline: viteFlag("VITE_FEATURE_GROWTH_LEAD_PIPELINE", false),
  businessDirectoryV2: viteFlag("VITE_FEATURE_BUSINESS_DIRECTORY_V2", false),
  directoryMonetizationK1: viteFlag("VITE_FEATURE_K1_DIRECTORY_MONETIZATION", false),
  growthWhatsappProviders: viteFlag("VITE_FEATURE_GROWTH_WHATSAPP_PROVIDERS", false),
  growthSocialScheduler: viteFlag("VITE_FEATURE_GROWTH_SOCIAL_SCHEDULER", false),
  founderDashboard: viteFlag("VITE_FEATURE_M0_FOUNDER_DASHBOARD", false),
  unifiedIdentity: viteFlag("VITE_FEATURE_M1_UNIFIED_IDENTITY", false),
  unifiedBusiness: viteFlag("VITE_FEATURE_M2_UNIFIED_BUSINESS", false),
  leadRouter: viteFlag("VITE_FEATURE_M3_LEAD_ROUTER", false),
  unifiedNotifications: viteFlag("VITE_FEATURE_M4_NOTIFICATIONS", false),
  unifiedSearch: viteFlag("VITE_FEATURE_M5_UNIFIED_SEARCH", false),
  /** Phase N2.1 — billing MVP (mock subscriptions) */
  billingV2: viteFlag("VITE_FEATURE_BILLING_V2", false),
} as const;

export function isGrowthUiEnabled(): boolean {
  return featureFlags.growthV2;
}
