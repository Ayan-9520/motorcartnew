import { api } from "@/lib/api/axios";

export type BillingPlanDto = {
  id: string;
  slug: string;
  name: string;
  tier_rank: number;
  price_monthly_inr: number;
  price_annual_inr: number;
  module_entitlements: Record<string, number | boolean>;
};

export type BillingOverviewDto = {
  subscription: Record<string, unknown>;
  entitlements: Record<string, unknown>;
  usage: {
    period: string;
    plan_slug: string;
    meters: Array<{
      key: string;
      used: number;
      limit: number;
      percent: number | null;
    }>;
  };
  invoices: Array<Record<string, unknown>>;
  feature_flags: { payments: boolean; gst_invoices: boolean; auto_renew: boolean };
};

export async function fetchBillingPlansApi(): Promise<BillingPlanDto[]> {
  const { data } = await api.get<{ data: { plans: BillingPlanDto[] } }>("/api/billing/plans");
  return data.data?.plans ?? [];
}

export async function fetchBillingOverviewApi(
  businessProfileId?: string | null
): Promise<BillingOverviewDto | null> {
  const q = businessProfileId ? `?business_profile_id=${encodeURIComponent(businessProfileId)}` : "";
  const { data } = await api.get<{ data: BillingOverviewDto }>(`/api/billing/overview${q}`);
  return data.data ?? null;
}

export async function changeBillingPlanApi(body: {
  plan_slug: string;
  billing_cycle?: "monthly" | "annual";
  business_profile_id?: string | null;
}): Promise<unknown> {
  const { data } = await api.post<{ data: unknown }>("/api/billing/subscription", body);
  return data.data;
}
