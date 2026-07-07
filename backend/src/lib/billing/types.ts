export type PlanSlug = "free" | "starter" | "professional" | "business" | "enterprise";

export type BillingCycle = "monthly" | "annual";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "paused"
  | "cancelled"
  | "expired";

export type BillingAccount = {
  id: string;
  owner_user_id: string;
  entity_type: string | null;
  entity_id: string | null;
  business_profile_id: string | null;
  created_at: string;
};

export type PlanDefinition = {
  id: string;
  slug: PlanSlug;
  name: string;
  tier_rank: number;
  price_monthly_inr: number;
  price_annual_inr: number;
  module_entitlements: Record<string, number | boolean>;
  business_type_overrides: Record<string, Record<string, number>>;
};

export type SubscriptionRecord = {
  id: string;
  billing_account_id: string;
  plan_slug: PlanSlug;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  mock_payment_status: "none" | "mock_paid";
  created_at: string;
  updated_at: string;
};

export type UsageRecord = {
  billing_account_id: string;
  period: string;
  meter_key: string;
  used: number;
  limit_snapshot: number;
  updated_at: string;
};

export type MockInvoice = {
  id: string;
  subscription_id: string;
  invoice_number: string;
  status: "draft" | "open" | "paid" | "void";
  total_inr: number;
  period_start: string;
  period_end: string;
  created_at: string;
};
