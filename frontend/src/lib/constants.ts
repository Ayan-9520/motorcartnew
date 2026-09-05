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
  "broker",
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
  broker: "/dashboard/broker",
};

/** @deprecated Vehicles hub nav removed — use Buy (`/buy`) instead */
export const VEHICLE_HUB_NAV = { label: "Vehicles", href: "/buy" } as const;

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
    stat: "New car catalog",
    href: "/buy/cars/new",
    description: "OEM dealers, on-road price & test drives",
    highlight: "Latest launches",
  },
  {
    id: "used-cars",
    label: "Certified Pre-Owned",
    icon: "CarFront",
    stat: "Certified pre-owned",
    href: "/buy/cars/used",
    description: "Inspected, warranty & AI fair price",
    highlight: "7-day return",
  },
  {
    id: "bikes",
    label: "Bikes",
    icon: "Bike",
    stat: "Two-wheeler listings",
    href: "/buy/bikes/used",
    description: "New & pre-owned two-wheelers",
  },
  {
    id: "trucks",
    label: "Trucks",
    icon: "Truck",
    stat: "Commercial listings",
    href: "/buy/trucks/used",
    description: "Commercial & logistics",
  },
  {
    id: "auctions",
    label: "Auctions",
    icon: "Gavel",
    stat: "Auction marketplace",
    href: "/auctions",
    description: "Bank repo & dealer auctions",
  },
  {
    id: "finance",
    label: "Finance",
    icon: "Landmark",
    stat: "Loan marketplace",
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
  { id: "new-cars", label: "New Cars", icon: "Car", count: "Catalog", href: "/buy/cars/new" },
  { id: "used-cars", label: "Certified Pre-Owned", icon: "CarFront", count: "Catalog", href: "/buy/cars/used" },
  { id: "bikes", label: "Bikes", icon: "Bike", count: "Listings", href: "/buy/bikes/used" },
  { id: "trucks", label: "Trucks", icon: "Truck", count: "Listings", href: "/buy/trucks/used" },
  { id: "buses", label: "Buses", icon: "Bus", count: "Listings", href: "/buy/buses/used" },
  { id: "ev", label: "EV", icon: "Zap", count: "Listings", href: "/buy/ev/new" },
] as const;

export const SEARCH_TABS = ["All", "Cars", "Bikes", "Auctions", "Parts", "Finance"] as const;
