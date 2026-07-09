import { api } from "@/lib/api/axios";
import { withApiTimeout } from "@/lib/api/with-timeout";

export type FounderDashboardDto = {
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
  read_only: boolean;
};

export async function fetchFounderOverviewApi(): Promise<FounderDashboardDto | null> {
  try {
    const { data } = await withApiTimeout(
      api.get<{ data: FounderDashboardDto }>("/api/founder/overview", { timeout: 5000 }),
      5000
    );
    return data.data ?? null;
  } catch {
    return null;
  }
}
