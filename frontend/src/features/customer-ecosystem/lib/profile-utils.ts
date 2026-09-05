import type { User } from "@/types";
import type { CustomerPreferences, CustomerVehicle, DashboardWidget } from "../types";

const GENERIC_NAMES = new Set(["customer", "user", "guest", "there", "motorcart"]);

/** Avoid greeting "Good afternoon, customer" when DB name is placeholder */
export function getCustomerDisplayName(user: Pick<User, "fullName" | "email"> | null | undefined): string {
  const raw = user?.fullName?.trim() ?? "";
  const lower = raw.toLowerCase();
  if (raw.length >= 2 && !GENERIC_NAMES.has(lower)) {
    return raw;
  }
  const email = user?.email?.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  if (email && email.length >= 2) {
    return email
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }
  return "there";
}

export type ProfileCheckItem = {
  id: string;
  label: string;
  done: boolean;
  href?: string;
};

export function buildProfileChecklist(
  user: Pick<User, "city" | "phone" | "kycStatus"> | null | undefined,
  preferences: CustomerPreferences,
  primaryVehicle?: CustomerVehicle
): ProfileCheckItem[] {
  const cityDone = Boolean(user?.city?.trim() || preferences.city?.trim());
  const contactDone = Boolean(user?.phone?.trim());
  const fastagDone = (primaryVehicle?.fastagBalance ?? 0) > 0;

  return [
    { id: "contact", label: "City & contact", done: cityDone && contactDone, href: "/dashboard/customer/profile" },
    { id: "dob", label: "Date of birth", done: Boolean(preferences.dob), href: "/dashboard/customer/profile" },
    { id: "fastag", label: fastagDone ? "FASTag linked" : "Link FASTag", done: fastagDone, href: "/dashboard/customer/fastag" },
    {
      id: "kyc",
      label: user?.kycStatus === "verified" ? "KYC verified" : "Complete KYC",
      done: user?.kycStatus === "verified",
      href: "/profile/kyc",
    },
  ];
}

export function computeProfileCompletion(items: ProfileCheckItem[]): number {
  if (!items.length) return 0;
  const done = items.filter((i) => i.done).length;
  return Math.round((done / items.length) * 100);
}

function formatEmiDate(iso?: string): string {
  if (!iso) return "Due soon";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch {
    return "Due soon";
  }
}

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatLakh(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
  return formatInr(amount);
}

/** Widgets derived from primary vehicle — consistent labels */
export function buildDashboardWidgets(
  primary: CustomerVehicle | undefined,
  preferences: CustomerPreferences,
  insightCount: number
): DashboardWidget[] {
  if (!primary) {
    return [
      { key: "garage", label: "My Garage", value: 0, sublabel: "Add your first vehicle", href: "/dashboard/customer/garage/add", variant: "premium" },
      { key: "rewards", label: "Reward points", value: preferences.rewardPointsBalance, sublabel: preferences.loyaltyTier, href: "/dashboard/customer/rewards", variant: "success" },
    ];
  }

  const carLabel = primary.model.split(" ")[0] ?? primary.model;
  const insDays = primary.insuranceDaysLeft;
  const svcDays = primary.serviceDueDays;

  return [
    {
      key: "health",
      label: "Vehicle health",
      value: primary.healthScore ?? 0,
      sublabel: `${carLabel} · /100 score`,
      progress: primary.healthScore,
      href: "/dashboard/customer/vehicle-health",
      variant: "premium",
    },
    {
      key: "insurance",
      label: "Insurance",
      value: insDays != null ? `${insDays} days` : "—",
      sublabel: insDays != null && insDays <= 15 ? "Renewal due · " + carLabel : `${carLabel} · Active`,
      href: "/dashboard/customer/insurance-wallet",
      variant: insDays != null && insDays <= 15 ? "warning" : "default",
    },
    {
      key: "emi",
      label: "EMI due",
      value: primary.emiDueAmount != null ? formatInr(primary.emiDueAmount) : "—",
      sublabel: formatEmiDate(primary.emiDueDate),
      href: "/dashboard/customer/loans",
      variant: "default",
    },
    {
      key: "service",
      label: "Service due",
      value: svcDays != null ? `${svcDays} days` : "—",
      sublabel: svcDays != null ? "left · Periodic" : "Not scheduled",
      href: "/dashboard/customer/service-records",
      variant: svcDays != null && svcDays <= 14 ? "warning" : "default",
    },
    {
      key: "fastag",
      label: "FASTag",
      value: formatInr(primary.fastagBalance ?? 0),
      sublabel: "NHAI wallet",
      href: "/dashboard/customer/fastag",
      variant: "default",
    },
    {
      key: "rewards",
      label: "Reward points",
      value: preferences.rewardPointsBalance,
      sublabel: `${preferences.loyaltyTier} tier`,
      href: "/dashboard/customer/rewards",
      variant: "success",
    },
    {
      key: "valuation",
      label: "Resale estimate",
      value: primary.resaleEstimate != null ? formatLakh(primary.resaleEstimate) : "—",
      sublabel: primary.resaleEstimate != null ? "From recorded estimate" : "Not recorded",
      href: "/dashboard/customer/garage",
      variant: "premium",
    },
    {
      key: "ai",
      label: "AI picks",
      value: insightCount,
      sublabel: insightCount === 1 ? "Action item" : "Action items",
      href: "/dashboard/customer/insights",
      variant: "premium",
    },
  ];
}
