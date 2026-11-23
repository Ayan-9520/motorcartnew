export interface DsaPlan {
  code: "starter" | "growth" | "agency";
  name: string;
  priceMonthly: number;
  applications: string;
  seats: string;
  features: string[];
  highlighted?: boolean;
}

/** Published DSA desk prices. Display only — assignment stays with MotorCart admin. */
export const DSA_PLANS: DsaPlan[] = [
  {
    code: "starter",
    name: "Starter",
    priceMonthly: 0,
    applications: "15 applications / month",
    seats: "1 user",
    features: [
      "Your own customer leads",
      "Application status tracking",
      "Loan marketplace (view)",
      "EMI and eligibility tools",
      "Email support",
    ],
  },
  {
    code: "growth",
    name: "Growth",
    priceMonthly: 1999,
    applications: "Unlimited applications",
    seats: "3 team seats",
    features: [
      "Loan lead CRM",
      "Pending-document desk",
      "CIBIL overview on files",
      "Commission and payout statement",
      "WhatsApp follow-up",
    ],
    highlighted: true,
  },
  {
    code: "agency",
    name: "Agency",
    priceMonthly: 6999,
    applications: "Unlimited applications",
    seats: "15 team seats",
    features: [
      "Everything in Growth",
      "Bank API desk",
      "Priority file assignment",
      "Sub-agent tracking",
      "Team conversion metrics",
    ],
  },
];

/** Share of the bank's DSA payout, not of the loan amount. */
export const DSA_PLATFORM_SHARE_PERCENT = 15;
