import { prisma } from "@/lib/prisma";

const DEALER_ROLES = [
  "dealer",
  "used_car_dealer",
  "new_car_dealer",
  "bike_dealer",
  "truck_dealer",
] as const;

export type FounderDashboardMetrics = {
  totals: {
    users: number;
    dealers: number;
    brokers: number;
    directory_listings: number;
    leads: number;
    campaigns: number;
    community_posts: number;
  };
  revenue_placeholders: {
    mrr_inr: number | null;
    arr_inr: number | null;
    paid_subscriptions: number | null;
    directory_monetization_inr: number | null;
    growth_whatsapp_inr: number | null;
    note: string;
  };
  generated_at: string;
  read_only: true;
};

export async function getFounderDashboardMetrics(): Promise<FounderDashboardMetrics> {
  const [
    users,
    dealers,
    brokers,
    directoryListings,
    leads,
    campaigns,
    communityPosts,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: { in: [...DEALER_ROLES] } } }),
    prisma.user.count({ where: { role: "broker" } }),
    prisma.communityBusinessProfile.count(),
    prisma.growthLeadCaptureEvent.count(),
    prisma.growthWhatsappBroadcast.count(),
    prisma.socialPost.count(),
  ]);

  return {
    totals: {
      users,
      dealers,
      brokers,
      directory_listings: directoryListings,
      leads,
      campaigns,
      community_posts: communityPosts,
    },
    revenue_placeholders: {
      mrr_inr: null,
      arr_inr: null,
      paid_subscriptions: null,
      directory_monetization_inr: null,
      growth_whatsapp_inr: null,
      note: "Revenue metrics are placeholders until billing (K1+) is connected. No transactions are recorded.",
    },
    generated_at: new Date().toISOString(),
    read_only: true,
  };
}
