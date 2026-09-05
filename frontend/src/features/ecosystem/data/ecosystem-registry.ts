import {
  Bike,
  BusFront,
  Calculator,
  Car,
  CarFront,
  CarTaxiFront,
  GitCompare,
  Gavel,
  Landmark,
  MessageSquare,
  Package,
  Shield,
  Sparkles,
  Star,
  Store,
  Truck,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type {
  EcosystemHubSlug,
  HubFilterChip,
  HubPromoBanner,
  HubServiceItem,
  VehicleHubDefinition,
} from "../types";
import { hubBuyPath, hubSellPath } from "../lib/hub-paths";
import { ECOSYSTEM_HERO_IMAGES } from "@/lib/media/india-media-catalog";

const q = (hub: EcosystemHubSlug, path: string, extra?: Record<string, string>) => {
  const params = new URLSearchParams({ hub, ...extra });
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${params.toString()}`;
};

function carServices(): HubServiceItem[] {
  return [
    { id: "new", label: "New Cars", description: "Latest models & on-road price", href: hubBuyPath("cars", "new"), icon: Car, featured: true },
    { id: "used", label: "Used Cars", description: "Certified pre-owned", href: hubBuyPath("cars", "used"), icon: CarFront, featured: true },
    { id: "sell", label: "Sell Car", description: "AI valuation & instant offers", href: hubSellPath("cars"), icon: Store },
    { id: "loans", label: "Car Loans", description: "Compare 14+ lenders", href: q("cars", "/finance"), icon: Landmark, badge: "8.5%" },
    { id: "insurance", label: "Car Insurance", description: "Compare & renew online", href: q("cars", "/insurance"), icon: Shield },
    { id: "service", label: "Car Service", description: "Book service & RC help", href: q("cars", "/services"), icon: Wrench },
    { id: "parts", label: "Car Parts", description: "OEM & aftermarket", href: q("cars", "/parts"), icon: Package },
    { id: "auctions", label: "Car Auctions", description: "Live repo & dealer lots", href: q("cars", "/auctions"), icon: Gavel, badge: "Live" },
    { id: "compare", label: "Compare Cars", description: "Specs, price & variants", href: "/vehicles/compare", icon: GitCompare },
    { id: "reviews", label: "Reviews", description: "Owner reviews & ratings", href: q("cars", "/community"), icon: Star },
    { id: "dealers", label: "Dealers", description: "Verified dealers", href: q("cars", "/dealers"), icon: Store },
    { id: "emi", label: "EMI Calculator", description: "Plan your monthly budget", href: "/finance/tools", icon: Calculator },
  ];
}

function bikeServices(): HubServiceItem[] {
  return [
    { id: "new", label: "New Bikes", description: "Latest scooters & motorcycles", href: hubBuyPath("bikes", "new"), icon: Bike, featured: true },
    { id: "used", label: "Used Bikes", description: "Verified two-wheelers", href: hubBuyPath("bikes", "used"), icon: Bike, featured: true },
    { id: "sell", label: "Sell Bike", description: "List in 5 minutes", href: hubSellPath("bikes"), icon: Store },
    { id: "loans", label: "Bike Loans", description: "Two-wheeler finance", href: q("bikes", "/finance"), icon: Landmark },
    { id: "insurance", label: "Bike Insurance", description: "Third-party & comprehensive", href: q("bikes", "/insurance"), icon: Shield },
    { id: "service", label: "Bike Service", description: "Periodic service booking", href: q("bikes", "/services"), icon: Wrench },
    { id: "parts", label: "Bike Parts", description: "Accessories & spares", href: q("bikes", "/parts"), icon: Package },
    { id: "auctions", label: "Bike Auctions", description: "Pre-owned lots", href: q("bikes", "/auctions"), icon: Gavel },
    { id: "compare", label: "Compare Bikes", description: "Mileage, specs & price", href: q("bikes", "/vehicles/compare"), icon: GitCompare },
    { id: "reviews", label: "Reviews", description: "Rider community", href: q("bikes", "/community"), icon: MessageSquare },
    { id: "dealers", label: "Dealers", description: "Bike dealers", href: q("bikes", "/dealers"), icon: Store },
    { id: "emi", label: "EMI Calculator", description: "Two-wheeler EMI", href: "/finance/compare?vehicle=bike", icon: Calculator },
  ];
}

function truckServices(): HubServiceItem[] {
  return [
    { id: "new", label: "New Trucks", description: "LCV & HCV launches", href: hubBuyPath("trucks", "new"), icon: Truck, featured: true },
    { id: "used", label: "Used Trucks", description: "Fleet-ready inventory", href: hubBuyPath("trucks", "used"), icon: Truck, featured: true },
    { id: "sell", label: "Sell Truck", description: "Commercial listings", href: hubSellPath("trucks"), icon: Store },
    { id: "loans", label: "Commercial Loans", description: "Fleet & asset finance", href: q("trucks", "/finance", { vehicle: "commercial" }), icon: Landmark },
    { id: "insurance", label: "Fleet Insurance", description: "Commercial cover", href: q("trucks", "/insurance"), icon: Shield },
    { id: "service", label: "Fleet Service", description: "Workshop & breakdown", href: q("trucks", "/services"), icon: Wrench },
    { id: "parts", label: "Spare Parts", description: "Commercial spares", href: q("trucks", "/parts"), icon: Package },
    { id: "auctions", label: "Commercial Auctions", description: "Repo & fleet disposal", href: q("trucks", "/auctions"), icon: Gavel, badge: "Fleet" },
    { id: "compare", label: "Compare Models", description: "Payload & tonnage", href: q("trucks", "/vehicles/compare"), icon: GitCompare },
    { id: "dealers", label: "Dealers", description: "CV dealers", href: q("trucks", "/dealers"), icon: Store },
    { id: "emi", label: "EMI Calculator", description: "Commercial EMI", href: "/finance/compare?vehicle=commercial", icon: Calculator },
  ];
}

function busServices(): HubServiceItem[] {
  return [
    { id: "new", label: "New Buses", description: "Staff & tourist coaches", href: hubBuyPath("buses", "new"), icon: BusFront, featured: true },
    { id: "used", label: "Used Buses", description: "Verified coaches", href: hubBuyPath("buses", "used"), icon: BusFront, featured: true },
    { id: "sell", label: "Sell Bus", description: "List your coach", href: hubSellPath("buses"), icon: Store },
    { id: "loans", label: "Fleet Loans", description: "NBFC & bank lease", href: q("buses", "/finance", { vehicle: "commercial" }), icon: Landmark },
    { id: "insurance", label: "Bus Insurance", description: "Passenger liability", href: q("buses", "/insurance"), icon: Shield },
    { id: "service", label: "Fleet Service", description: "Maintenance contracts", href: q("buses", "/services"), icon: Wrench },
    { id: "parts", label: "Bus Parts", description: "Coach components", href: q("buses", "/parts"), icon: Package },
    { id: "auctions", label: "Coach Auctions", description: "Fleet disposal", href: q("buses", "/auctions"), icon: Gavel },
    { id: "dealers", label: "Dealers", description: "Coach sellers", href: q("buses", "/dealers"), icon: Store },
    { id: "emi", label: "Lease Calculator", description: "Monthly fleet cost", href: "/finance/compare?vehicle=commercial", icon: Calculator },
  ];
}

function evServices(): HubServiceItem[] {
  return [
    { id: "new", label: "New EVs", description: "Electric cars & bikes", href: hubBuyPath("ev", "new"), icon: Zap, featured: true },
    { id: "used", label: "Used EVs", description: "Battery health checked", href: hubBuyPath("ev", "used"), icon: CarFront, featured: true },
    { id: "sell", label: "Sell EV", description: "EV-specialist buyers", href: hubSellPath("ev"), icon: Store },
    { id: "loans", label: "Green Loans", description: "EV subsidies & rates", href: q("ev", "/finance"), icon: Landmark, badge: "Green" },
    { id: "insurance", label: "EV Insurance", description: "Battery & vehicle cover", href: q("ev", "/insurance"), icon: Shield },
    { id: "service", label: "EV Service", description: "Charging & maintenance", href: q("ev", "/services"), icon: Wrench },
    { id: "parts", label: "EV Parts", description: "Chargers & accessories", href: q("ev", "/parts"), icon: Package },
    { id: "auctions", label: "EV Auctions", description: "Pre-owned electric lots", href: q("ev", "/auctions"), icon: Gavel },
    { id: "compare", label: "Compare EVs", description: "Range, battery & price", href: q("ev", "/vehicles/compare"), icon: GitCompare },
    { id: "reviews", label: "EV Reviews", description: "Owner experiences", href: q("ev", "/community"), icon: Star },
    { id: "dealers", label: "EV Dealers", description: "Authorized networks", href: q("ev", "/dealers"), icon: Store },
    { id: "ai", label: "EV Advisor", description: "Range & charging fit", href: "/ai", icon: Sparkles },
  ];
}

function autoServices(): HubServiceItem[] {
  return [
    { id: "new", label: "New Autos", description: "Passenger & cargo", href: hubBuyPath("auto", "new"), icon: CarTaxiFront, featured: true },
    { id: "used", label: "Used Autos", description: "CNG-ready listings", href: hubBuyPath("auto", "used"), icon: CarTaxiFront, featured: true },
    { id: "sell", label: "Sell Auto", description: "High local demand", href: hubSellPath("auto"), icon: Store },
    { id: "loans", label: "Auto Loans", description: "Quick approval", href: q("auto", "/finance"), icon: Landmark },
    { id: "insurance", label: "Auto Insurance", description: "Passenger cover", href: q("auto", "/insurance"), icon: Shield },
    { id: "service", label: "Auto Service", description: "Workshop booking", href: q("auto", "/services"), icon: Wrench },
    { id: "parts", label: "Auto Parts", description: "Spares & accessories", href: q("auto", "/parts"), icon: Package },
    { id: "auctions", label: "Auto Auctions", description: "Fleet & individual", href: q("auto", "/auctions"), icon: Gavel },
    { id: "dealers", label: "Dealers", description: "Auto sellers", href: q("auto", "/dealers"), icon: Store },
    { id: "emi", label: "EMI Calculator", description: "Monthly installment", href: "/finance/compare", icon: Calculator },
  ];
}

const HUB_ICONS: Record<EcosystemHubSlug, LucideIcon> = {
  cars: Car,
  bikes: Bike,
  trucks: Truck,
  buses: BusFront,
  ev: Zap,
  auto: CarTaxiFront,
};

function defaultFilters(slug: EcosystemHubSlug): HubFilterChip[] {
  const base = [
    { id: "new", label: "New", href: hubBuyPath(slug, "new") },
    { id: "used", label: "Pre-Owned", href: hubBuyPath(slug, "used") },
    { id: "sell", label: "Sell", href: hubSellPath(slug) },
  ];
  if (slug === "cars") {
    return [
      { id: "new", label: "New Cars", href: "/new-cars" },
      { id: "used", label: "Used Cars", href: "/used-cars" },
      { id: "under-10", label: "Under ₹10L", href: q(slug, "/search", { q: "under 10 lakh" }) },
      { id: "suv", label: "SUV", href: q(slug, "/search", { q: "SUV" }) },
      { id: "ev", label: "Electric", href: q(slug, "/search", { q: "electric car" }) },
      { id: "sell", label: "Sell", href: hubSellPath(slug) },
    ];
  }
  return [
    ...base,
    { id: "finance", label: "Finance", href: q(slug, "/finance") },
    { id: "auctions", label: "Auctions", href: q(slug, "/auctions") },
  ];
}

function defaultBanners(slug: EcosystemHubSlug, label: string): HubPromoBanner[] {
  return [
    {
      id: "primary",
      title: `Find your ${label.toLowerCase()}`,
      subtitle: "Verified listings · AI fair price · instant EMI",
      ctaLabel: "Browse listings",
      href: hubBuyPath(slug, slug === "cars" ? "used" : "used"),
      variant: "primary",
    },
    {
      id: "sell",
      title: `Sell your ${label.toLowerCase()}`,
      subtitle: "Free valuation · RC help · same-day offers",
      ctaLabel: "Start selling",
      href: hubSellPath(slug),
      variant: "soft",
    },
  ];
}

export const VEHICLE_HUB_REGISTRY: Record<EcosystemHubSlug, VehicleHubDefinition> = {
  cars: {
    slug: "cars",
    label: "Cars",
    shortLabel: "Cars",
    tagline: "New & used cars — one ecosystem",
    description: "Browse, compare, finance, insure, service and sell cars — without leaving the Cars hub.",
    heroImage: ECOSYSTEM_HERO_IMAGES.cars,
    icon: HUB_ICONS.cars,
    stats: { listings: "Listings", dealers: "Verified dealers" },
    searchPlaceholder: "Search cars — Creta, Swift, Mumbai…",
    brands: ["Maruti", "Hyundai", "Tata", "Honda", "Mahindra", "Toyota", "Kia", "MG"],
    budgets: ["Under ₹5L", "₹5–10L", "₹10–20L", "₹20L+"],
    filters: defaultFilters("cars"),
    banners: [
      {
        id: "new",
        title: "New car launches",
        subtitle: "On-road price · test drives · OEM offers",
        ctaLabel: "Explore new",
        href: "/new-cars",
        variant: "primary",
      },
      {
        id: "used",
        title: "Certified pre-owned",
        subtitle: "200+ point inspection · 7-day return",
        ctaLabel: "Browse used",
        href: "/used-cars",
        variant: "soft",
      },
    ],
    services: carServices(),
  },
  bikes: {
    slug: "bikes",
    label: "Bikes",
    shortLabel: "Bikes",
    tagline: "Scooters & motorcycles",
    description: "Everything for two-wheelers — buy, sell, finance, parts and service in one place.",
    heroImage: ECOSYSTEM_HERO_IMAGES.bikes,
    icon: HUB_ICONS.bikes,
    stats: { listings: "Listings", dealers: "Verified dealers" },
    searchPlaceholder: "Search bikes — Activa, Classic 350…",
    brands: ["Hero", "Honda", "Bajaj", "TVS", "Royal Enfield", "Yamaha", "KTM"],
    budgets: ["Under ₹1L", "₹1–2L", "₹2–3L", "₹3L+"],
    filters: defaultFilters("bikes"),
    banners: defaultBanners("bikes", "Bike"),
    services: bikeServices(),
  },
  trucks: {
    slug: "trucks",
    label: "Trucks",
    shortLabel: "Trucks",
    tagline: "Commercial & logistics",
    description: "LCV, pickups and heavy commercial — built for fleet owners and operators.",
    heroImage: ECOSYSTEM_HERO_IMAGES.trucks,
    icon: HUB_ICONS.trucks,
    stats: { listings: "Listings", dealers: "Verified dealers" },
    searchPlaceholder: "Search trucks — Tata Ace, 407, tonnage…",
    brands: ["Tata", "Ashok Leyland", "Mahindra", "Eicher", "BharatBenz"],
    budgets: ["Under ₹10L", "₹10–25L", "₹25–50L", "₹50L+"],
    filters: defaultFilters("trucks"),
    banners: defaultBanners("trucks", "Truck"),
    services: truckServices(),
  },
  buses: {
    slug: "buses",
    label: "Buses",
    shortLabel: "Buses",
    tagline: "Staff transport & coaches",
    description: "School, staff and tourist coaches — fleet finance and verified sellers.",
    heroImage: ECOSYSTEM_HERO_IMAGES.buses,
    icon: HUB_ICONS.buses,
    stats: { listings: "Listings", dealers: "Verified dealers" },
    searchPlaceholder: "Search buses — seats, Volvo, Traveller…",
    brands: ["Tata", "Ashok Leyland", "Force", "Volvo", "Eicher"],
    budgets: ["Under ₹15L", "₹15–30L", "₹30L+"],
    filters: defaultFilters("buses"),
    banners: defaultBanners("buses", "Bus"),
    services: busServices(),
  },
  ev: {
    slug: "ev",
    label: "Electric",
    shortLabel: "EV",
    tagline: "Electric cars & two-wheelers",
    description: "Battery health, charging fit and green finance — the EV-only ecosystem.",
    heroImage: ECOSYSTEM_HERO_IMAGES.ev,
    icon: HUB_ICONS.ev,
    stats: { listings: "Listings", dealers: "Verified dealers" },
    searchPlaceholder: "Search EVs — Nexon EV, Ola, range…",
    brands: ["Tata", "MG", "Hyundai", "Mahindra", "Ola", "Ather"],
    budgets: ["Under ₹8L", "₹8–15L", "₹15L+"],
    filters: [
      { id: "new", label: "New EV", href: hubBuyPath("ev", "new") },
      { id: "used", label: "Used EV", href: hubBuyPath("ev", "used") },
      { id: "car", label: "Electric Cars", href: q("ev", "/search", { q: "electric car" }) },
      { id: "bike", label: "Electric Bikes", href: q("ev", "/search", { q: "electric scooter" }) },
      { id: "sell", label: "Sell EV", href: hubSellPath("ev") },
    ],
    banners: [
      {
        id: "green",
        title: "Green loan rates",
        subtitle: "Subsidy-aware EMI · battery report",
        ctaLabel: "Check eligibility",
        href: q("ev", "/finance"),
        variant: "primary",
      },
      {
        id: "browse",
        title: "Browse electric",
        subtitle: "Cars & two-wheelers with range filters",
        ctaLabel: "View listings",
        href: hubBuyPath("ev", "new"),
        variant: "soft",
      },
    ],
    services: evServices(),
  },
  auto: {
    slug: "auto",
    label: "Auto",
    shortLabel: "Auto",
    tagline: "Passenger & cargo three-wheelers",
    description: "Auto rickshaws — CNG, passenger and cargo variants with local demand.",
    heroImage: ECOSYSTEM_HERO_IMAGES.auto,
    icon: HUB_ICONS.auto,
    stats: { listings: "Listings", dealers: "Verified dealers" },
    searchPlaceholder: "Search autos — Bajaj RE, Piaggio Ape…",
    brands: ["Bajaj", "Piaggio", "Mahindra", "TVS"],
    budgets: ["Under ₹3L", "₹3–5L", "₹5L+"],
    filters: defaultFilters("auto"),
    banners: defaultBanners("auto", "Auto"),
    services: autoServices(),
  },
};

export function getVehicleHub(slug: EcosystemHubSlug): VehicleHubDefinition {
  return VEHICLE_HUB_REGISTRY[slug];
}

export function getAllVehicleHubs(): VehicleHubDefinition[] {
  return Object.values(VEHICLE_HUB_REGISTRY);
}
