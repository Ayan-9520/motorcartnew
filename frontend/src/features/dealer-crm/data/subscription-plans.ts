export type SubscriptionPlanCode = "free" | "premium" | "enterprise";

export interface SubscriptionPlan {
  code: SubscriptionPlanCode;
  name: string;
  priceMonthly: number;
  maxListings: number;
  maxTeamMembers: number;
  features: string[];
  highlighted?: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    code: "free",
    name: "Free",
    priceMonthly: 0,
    maxListings: 10,
    maxTeamMembers: 2,
    features: [
      "10 live marketplace listings",
      "Public showroom storefront",
      "Lead inbox for new enquiries",
      "Photos, price and basic specs",
      "Email support",
    ],
  },
  {
    code: "premium",
    name: "Premium",
    priceMonthly: 4999,
    maxListings: 150,
    maxTeamMembers: 10,
    features: [
      "150 live listings",
      "Lead CRM with pipeline stages",
      "Follow-up reminders",
      "Bulk Excel inventory upload",
      "WhatsApp on every lead",
      "Analytics and AI price guidance",
      "AI Brochure Studio and poster reports",
    ],
    highlighted: true,
  },
  {
    code: "enterprise",
    name: "Enterprise",
    priceMonthly: 14999,
    maxListings: 9999,
    maxTeamMembers: 50,
    features: [
      "Unlimited listings",
      "Everything in Premium",
      "Team roles and permissions",
      "Auction desk",
      "API and webhooks",
      "Dedicated success manager",
    ],
  },
];

export function planFromTier(tier: string): SubscriptionPlan {
  const code = (["free", "premium", "enterprise"].includes(tier) ? tier : "free") as SubscriptionPlanCode;
  return SUBSCRIPTION_PLANS.find((p) => p.code === code) ?? SUBSCRIPTION_PLANS[0];
}
