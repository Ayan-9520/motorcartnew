function viteFlag(name: string, defaultOn = true): boolean {
  const v = import.meta.env[name] as string | undefined;
  if (v === undefined || v === "") return defaultOn;
  const lower = String(v).toLowerCase();
  return lower === "1" || lower === "true" || lower === "yes";
}

/** When true (or production build), phased ecosystem modules default ON. */
const ecosystemOn = viteFlag("VITE_FULL_ECOSYSTEM", import.meta.env.PROD);

export const featureFlags = {
  vehicleSaleMode: viteFlag("VITE_FEATURE_VEHICLE_SALE_MODE"),
  newCarInventoryV2: viteFlag("VITE_FEATURE_NEW_CAR_INVENTORY_V2"),
  wishlistDb: viteFlag("VITE_FEATURE_WISHLIST_DB"),
  unifiedVehicleApi: viteFlag("VITE_FEATURE_UNIFIED_VEHICLE_API"),
  partsCompatibility: viteFlag("VITE_FEATURE_PARTS_COMPATIBILITY"),
  /** Phase F — ecosystem modules */
  auctionV2: viteFlag("VITE_FEATURE_AUCTION_V2", ecosystemOn),
  auctionCategories: viteFlag("VITE_FEATURE_AUCTION_CATEGORIES", ecosystemOn),
  auctionProxyBid: viteFlag("VITE_FEATURE_AUCTION_PROXY_BID", ecosystemOn),
  auctionAutoBid: viteFlag("VITE_FEATURE_AUCTION_AUTO_BID", ecosystemOn),
  auctionWatchlist: viteFlag("VITE_FEATURE_AUCTION_WATCHLIST", ecosystemOn),
  auctionBidHistory: viteFlag("VITE_FEATURE_AUCTION_BID_HISTORY", ecosystemOn),
  auctionKycGate: viteFlag("VITE_FEATURE_AUCTION_KYC_GATE", ecosystemOn),
  /** Phase E */
  brokerCrm: viteFlag("VITE_FEATURE_BROKER_CRM", ecosystemOn),
  brokerContacts: viteFlag("VITE_FEATURE_BROKER_CONTACTS", ecosystemOn),
  brokerLeads: viteFlag("VITE_FEATURE_BROKER_LEADS", ecosystemOn),
  brokerDeals: viteFlag("VITE_FEATURE_BROKER_DEALS", ecosystemOn),
  brokerVehicleAssign: viteFlag("VITE_FEATURE_BROKER_VEHICLE_ASSIGN", ecosystemOn),
  brokerTasks: viteFlag("VITE_FEATURE_BROKER_TASKS", ecosystemOn),
  brokerCommissions: viteFlag("VITE_FEATURE_BROKER_COMMISSIONS", ecosystemOn),
  brokerWhatsapp: viteFlag("VITE_FEATURE_BROKER_WHATSAPP", ecosystemOn),
  brokerMarketplaceBridge: viteFlag("VITE_FEATURE_BROKER_MARKETPLACE_BRIDGE", ecosystemOn),
  /** Phase I */
  communityV2: viteFlag("VITE_FEATURE_COMMUNITY_V2", ecosystemOn),
  communityProfiles: viteFlag("VITE_FEATURE_COMMUNITY_PROFILES", ecosystemOn),
  communityBusinessProfiles: viteFlag("VITE_FEATURE_COMMUNITY_BUSINESS_PROFILES", ecosystemOn),
  communityFeed: viteFlag("VITE_FEATURE_COMMUNITY_FEED", ecosystemOn),
  communityPosts: viteFlag("VITE_FEATURE_COMMUNITY_POSTS", ecosystemOn),
  communityFollow: viteFlag("VITE_FEATURE_COMMUNITY_FOLLOW", ecosystemOn),
  communityGroups: viteFlag("VITE_FEATURE_COMMUNITY_GROUPS", ecosystemOn),
  communityGroupFeed: viteFlag("VITE_FEATURE_COMMUNITY_GROUP_FEED", ecosystemOn),
  communityGroupModeration: viteFlag("VITE_FEATURE_COMMUNITY_GROUP_MODERATION", ecosystemOn),
  communityBusinessPages: viteFlag("VITE_FEATURE_COMMUNITY_BUSINESS_PAGES", ecosystemOn),
  /** Phase J — Growth CRM */
  growthV2: viteFlag("VITE_FEATURE_GROWTH_V2", ecosystemOn),
  growthWorkspaces: viteFlag("VITE_FEATURE_GROWTH_WORKSPACES", ecosystemOn),
  growthAssets: viteFlag("VITE_FEATURE_GROWTH_ASSETS", ecosystemOn),
  growthPosters: viteFlag("VITE_FEATURE_GROWTH_POSTERS", ecosystemOn),
  growthWhatsapp: viteFlag("VITE_FEATURE_GROWTH_WHATSAPP", ecosystemOn),
  growthLeads: viteFlag("VITE_FEATURE_GROWTH_LEADS", ecosystemOn),
  growthLeadPipeline: viteFlag("VITE_FEATURE_GROWTH_LEAD_PIPELINE", ecosystemOn),
  businessDirectoryV2: viteFlag("VITE_FEATURE_BUSINESS_DIRECTORY_V2", ecosystemOn),
  directoryMonetizationK1: viteFlag("VITE_FEATURE_K1_DIRECTORY_MONETIZATION", ecosystemOn),
  growthWhatsappProviders: viteFlag("VITE_FEATURE_GROWTH_WHATSAPP_PROVIDERS", ecosystemOn),
  growthSocialScheduler: viteFlag("VITE_FEATURE_GROWTH_SOCIAL_SCHEDULER", ecosystemOn),
  founderDashboard: viteFlag("VITE_FEATURE_M0_FOUNDER_DASHBOARD", ecosystemOn),
  unifiedIdentity: viteFlag("VITE_FEATURE_M1_UNIFIED_IDENTITY", ecosystemOn),
  unifiedBusiness: viteFlag("VITE_FEATURE_M2_UNIFIED_BUSINESS", ecosystemOn),
  leadRouter: viteFlag("VITE_FEATURE_M3_LEAD_ROUTER", ecosystemOn),
  unifiedNotifications: viteFlag("VITE_FEATURE_M4_NOTIFICATIONS", ecosystemOn),
  unifiedSearch: viteFlag("VITE_FEATURE_M5_UNIFIED_SEARCH", ecosystemOn),
  /** Phase N2.1 — billing MVP */
  billingV2: viteFlag("VITE_FEATURE_BILLING_V2", ecosystemOn),
  /** Phase 5B — catalog import admin (dry-run) */
  catalogAdmin: viteFlag("VITE_FEATURE_CATALOG_ADMIN", false),
  organizationLayer: viteFlag("VITE_FEATURE_ORGANIZATION_LAYER", true),
} as const;

export function isGrowthUiEnabled(): boolean {
  return featureFlags.growthV2;
}
