export const SITE_NAME = "Motorcart.in";
export const SITE_TAGLINE = "India's AI-Powered Automobile Ecosystem";
export const SITE_URL = import.meta.env.VITE_SITE_URL ?? "https://motorcart.in";

export { SITE_CONTACT, SITE_DESCRIPTION, SITE_STATS, SITE_STATS_BAR } from "@/content/site-content";

import { darkColors, palette } from "@/theme/colors";

/** @deprecated Prefer CSS variables / Tailwind semantic tokens (`bg-background`, `text-foreground`, etc.) */
export const BRAND = {
  green: palette.green,
  greenHover: palette.greenHover,
  bg: darkColors.background,
  bgSecondary: darkColors.backgroundSecondary,
  card: darkColors.card,
  border: darkColors.border,
  textSecondary: darkColors.foregroundSecondary,
  textMuted: darkColors.foregroundMuted,
  danger: palette.danger,
  warning: palette.warning,
} as const;

export const USER_ROLES = [
  "customer",
  "dealer",
  "used_car_dealer",
  "new_car_dealer",
  "bike_dealer",
  "truck_dealer",
  "dsa_agent",
  "bank_nbfc",
  "finance_manager",
  "service_center",
  "service_partner",
  "preowned_dealer",
  "service_technician",
  "parts_seller",
  "admin",
  "super_admin",
  "auction_partner",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const DASHBOARD_ROUTES: Partial<Record<UserRole, string>> = {
  customer: "/dashboard/customer",
  dealer: "/dashboard/dealer",
  used_car_dealer: "/dashboard/dealer",
  new_car_dealer: "/dashboard/new-car",
  bike_dealer: "/dashboard/dealer",
  truck_dealer: "/dashboard/dealer",
  dsa_agent: "/dashboard/dsa",
  bank_nbfc: "/dashboard/finance",
  finance_manager: "/dashboard/finance-manager",
  service_center: "/dashboard/service",
  service_partner: "/dashboard/service",
  preowned_dealer: "/dashboard/dealer",
  service_technician: "/dashboard/technician",
  super_admin: "/dashboard/super-admin",
  parts_seller: "/dashboard/parts",
  admin: "/dashboard/super-admin",
  auction_partner: "/dashboard/auction",
};

/** Main nav entry for all vehicle hubs (cars, bikes, trucks, …) — not only cars */
export const VEHICLE_HUB_NAV = { label: "Vehicles", href: "/cars" } as const;

export const VEHICLE_HUB_PATH_PREFIXES = [
  "/cars",
  "/bikes",
  "/trucks",
  "/buses",
  "/ev",
  "/auto",
  "/buy",
  "/sell",
  "/new-cars",
  "/used-cars",
] as const;

export function isVehicleHubNavPath(pathname: string): boolean {
  return VEHICLE_HUB_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export const NAV_LINKS = [
  VEHICLE_HUB_NAV,
  { label: "Buy", href: "/buy" },
  { label: "Sell", href: "/sell" },
  { label: "Auctions", href: "/auctions" },
  { label: "Finance", href: "/finance" },
  { label: "Insurance", href: "/insurance" },
  { label: "Parts", href: "/parts" },
  { label: "Services", href: "/services" },
  { label: "Community", href: "/community" },
  { label: "AI", href: "/ai" },
  { label: "Dealers", href: "/dealers" },
] as const;

export const VEHICLE_ECOSYSTEM = [
  {
    id: "new-cars",
    label: "New Cars",
    icon: "Car",
    stat: "45K+",
    href: "/new-cars",
    description: "OEM dealers, on-road price & test drives",
    highlight: "Latest launches",
  },
  {
    id: "used-cars",
    label: "Certified Pre-Owned",
    icon: "CarFront",
    stat: "2.1L+",
    href: "/used-cars",
    description: "Inspected, warranty & AI fair price",
    highlight: "7-day return",
  },
  {
    id: "bikes",
    label: "Bikes",
    icon: "Bike",
    stat: "85K+",
    href: "/vehicles/bikes",
    description: "New & pre-owned two-wheelers",
  },
  {
    id: "trucks",
    label: "Trucks",
    icon: "Truck",
    stat: "12K+",
    href: "/vehicles/trucks",
    description: "Commercial & logistics",
  },
  {
    id: "auctions",
    label: "Auctions",
    icon: "Gavel",
    stat: "142 live",
    href: "/auctions",
    description: "Bank repo & dealer auctions",
  },
  {
    id: "finance",
    label: "Finance",
    icon: "Landmark",
    stat: "₹1200Cr+",
    href: "/finance",
    description: "Loans & instant eligibility",
  },
  {
    id: "services",
    label: "Services",
    icon: "Wrench",
    stat: "4.8★",
    href: "/services",
    description: "Service & repair booking",
  },
] as const;

export const VEHICLE_CATEGORIES = [
  { id: "new-cars", label: "New Cars", icon: "Car", count: "45K+", href: "/new-cars" },
  { id: "used-cars", label: "Certified Pre-Owned", icon: "CarFront", count: "2.1L+", href: "/used-cars" },
  { id: "bikes", label: "Bikes", icon: "Bike", count: "85K+", href: "/vehicles/bikes" },
  { id: "trucks", label: "Trucks", icon: "Truck", count: "12K+", href: "/vehicles/trucks" },
  { id: "buses", label: "Buses", icon: "Bus", count: "3K+", href: "/vehicles/buses" },
  { id: "ev", label: "EV", icon: "Zap", count: "28K+", href: "/vehicles/ev" },
] as const;

export const SEARCH_TABS = ["All", "Cars", "Bikes", "Auctions", "Parts", "Finance"] as const;
