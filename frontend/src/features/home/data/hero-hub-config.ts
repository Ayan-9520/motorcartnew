import type { LucideIcon } from "lucide-react";
import {
  Bike,
  BusFront,
  Calculator,
  Car,
  CarFront,
  CarTaxiFront,
  Gavel,
  GitCompare,
  Landmark,
  Package,
  Store,
  Truck,
  Wrench,
} from "lucide-react";
import type { HeroInsightPick, HeroSearchMode } from "@/features/home/data/homepage-data";
import {
  PHASE1_DASHBOARD_TAGS,
  PHASE1_ECOSYSTEM_DASHBOARD,
} from "@/features/home/data/phase1-home-data";
import { buyListingPath } from "@/features/marketplace/lib/route-utils";
import { FEATURED_VEHICLE_IMAGES, getVehicleHero } from "@/lib/media/india-media-catalog";

const HUB_BUY_USED = {
  cars: buyListingPath("cars", "used"),
  bikes: buyListingPath("bikes", "used"),
  trucks: buyListingPath("trucks", "used"),
  buses: buyListingPath("buses", "used"),
  auto: buyListingPath("auto", "used"),
} as const;

export interface HeroHubQuickLink {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
}

export interface HeroDashboardCard {
  type: "listing" | "auction" | "loan" | "ai" | "stats";
  title: string;
  subtitle?: string;
  price?: number;
  meta?: string;
  image?: string;
  href: string;
  badge?: string;
  live?: boolean;
  /** ISO timestamp — powers live auction countdown in hero panel */
  endsAt?: string;
  bidCount?: number;
}

export interface HeroHubConfig {
  label: string;
  headlineSuffix: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  browseFooter: string;
  insightsFoot: string;
  pickCta: string;
  brands: string[];
  budgets: string[];
  fuels: string[];
  aiPicks: HeroInsightPick[];
  trending: HeroInsightPick[];
  quickLinks: HeroHubQuickLink[];
  dashboard: HeroDashboardCard[];
  dashboardTags: string[];
  ecosystemIds: string[];
  categoryIds: string[];
}

const CITIES = ["Mumbai", "Delhi NCR", "Bangalore", "Hyderabad", "Chennai", "Pune", "Kolkata", "Ahmedabad"];

const CAR_BRANDS = ["Maruti", "Hyundai", "Tata", "Honda", "Mahindra", "Toyota", "Kia", "BMW", "Mercedes-Benz", "MG"];
const BIKE_BRANDS = ["Hero", "Honda", "Bajaj", "TVS", "Royal Enfield", "Yamaha", "KTM", "Suzuki"];
const TRUCK_BRANDS = ["Tata", "Ashok Leyland", "Mahindra", "Eicher", "BharatBenz", "Force"];
const BUS_BRANDS = ["Tata", "Ashok Leyland", "Mahindra", "Force", "Volvo", "Eicher"];
const AUTO_BRANDS = ["Bajaj", "Piaggio", "Mahindra", "TVS"];

const CAR_QUICK: HeroHubQuickLink[] = [
  { label: "New Cars", href: "/new-cars", icon: Car, description: "Latest models" },
  { label: "Pre-Owned Cars", href: "/used-cars", icon: CarFront, description: "Certified pre-owned" },
  { label: "Car Parts", href: "/parts", icon: Package, description: "OEM & aftermarket" },
  { label: "Car Auctions", href: "/auctions", icon: Gavel, description: "Live bidding" },
  { label: "Car Loans", href: "/finance", icon: Landmark, description: "Compare banks" },
  { label: "Service & RC", href: "/services", icon: Wrench, description: "Book online" },
  { label: "Compare", href: "/vehicles/compare", icon: GitCompare },
  { label: "Sell Car", href: "/sell", icon: Store },
];

const BIKE_QUICK: HeroHubQuickLink[] = [
  { label: "New Bikes", href: HUB_BUY_USED.bikes, icon: Bike, description: "Latest launches" },
  { label: "Pre-Owned Bikes", href: "/buy/bikes/used", icon: Bike, description: "Verified listings" },
  { label: "Bike Parts", href: "/parts?category=accessories", icon: Package },
  { label: "Bike Finance", href: "/finance", icon: Landmark },
  { label: "Service", href: "/services", icon: Wrench },
  { label: "Sell Bike", href: "/sell", icon: Store },
];

const TRUCK_QUICK: HeroHubQuickLink[] = [
  { label: "Commercial Trucks", href: HUB_BUY_USED.trucks, icon: Truck },
  { label: "Fleet Finance", href: "/finance", icon: Landmark },
  { label: "Spare Parts", href: "/parts", icon: Package },
  { label: "Commercial Auctions", href: "/auctions", icon: Gavel },
  { label: "Sell Commercial", href: "/sell", icon: Store },
];

const AUTO_QUICK: HeroHubQuickLink[] = [
  { label: "Passenger Auto", href: HUB_BUY_USED.auto, icon: CarTaxiFront },
  { label: "Cargo Auto", href: HUB_BUY_USED.auto, icon: Truck },
  { label: "Auto Finance", href: "/finance", icon: Landmark },
  { label: "Sell Auto", href: "/sell", icon: Store },
];

const BUS_QUICK: HeroHubQuickLink[] = [
  { label: "Staff Buses", href: HUB_BUY_USED.buses, icon: BusFront },
  { label: "Luxury Coaches", href: "/buy/buses/used", icon: BusFront },
  { label: "Fleet Loans", href: "/finance", icon: Landmark },
  { label: "Commercial Auctions", href: "/auctions", icon: Gavel },
];

const AUCTION_QUICK: HeroHubQuickLink[] = [
  { label: "Live Auctions", href: "/auctions", icon: Gavel, description: "Bid now" },
  { label: "Bank Repo", href: "/auctions?type=repo", icon: Landmark },
  { label: "Car Auctions", href: "/auctions?hub=cars", icon: Car },
  { label: "Commercial Lots", href: "/auctions?hub=trucks", icon: Truck },
];

const FINANCE_QUICK: HeroHubQuickLink[] = [
  { label: "Car Loans", href: "/finance", icon: Car },
  { label: "Compare Banks", href: "/finance/compare", icon: Landmark },
  { label: "EMI Calculator", href: "/finance/compare", icon: Calculator },
  { label: "Bike Loans", href: "/finance?vehicle=bike", icon: Bike },
  { label: "Commercial Finance", href: "/finance?vehicle=commercial", icon: Truck },
];

export const HERO_HUB_CONFIG: Record<HeroSearchMode, HeroHubConfig> = {
  cars: {
    label: "Cars",
    headlineSuffix: "New & certified pre-owned cars",
    primaryCta: { label: "Browse cars", href: HUB_BUY_USED.cars },
    secondaryCta: { label: "Sell your car", href: "/sell" },
    browseFooter: "New & pre-owned cars · parts · loans · auctions",
    insightsFoot: "Opens car marketplace — new, used, parts & finance",
    pickCta: "View listing",
    brands: CAR_BRANDS,
    budgets: ["Under ₹5L", "₹5L – ₹10L", "₹10L – ₹20L", "₹20L+", "12 lakh SUV", "8 lakh sedan"],
    fuels: ["Petrol", "Diesel", "CNG", "Electric", "Hybrid"],
    aiPicks: [
      { id: "c1", title: "Best SUV under ₹15L", subtitle: "AI matched · Mumbai & NCR", query: "SUV under 15L", mode: "cars", badge: "Hot" },
      { id: "c2", title: "Low EMI hatchbacks", subtitle: "Verified dealers · high resale", query: "hatchback low EMI", mode: "cars", badge: "EMI" },
      { id: "c3", title: "Certified pre-owned sedans", subtitle: "200+ point inspection", query: "certified sedan", mode: "cars", badge: "Pre-Owned" },
    ],
    trending: [
      { id: "t1", title: "Creta 2024", subtitle: "Popular SUV", query: "Creta 2024", mode: "cars" },
      { id: "t2", title: "Swift VDI", subtitle: "Best value", query: "Swift VDI", mode: "cars" },
      { id: "t3", title: "Nexon EV", subtitle: "Electric SUVs", query: "Nexon EV", mode: "cars" },
      { id: "t4", title: "Fortuner 4x4", subtitle: "Premium diesel", query: "Fortuner", mode: "cars" },
    ],
    quickLinks: CAR_QUICK,
    dashboard: [
      { type: "auction", title: "2019 Honda City VX", price: 782000, meta: "Ending soon · bids", href: "/auctions", badge: "Auction", live: false },
      { type: "listing", title: "Creta SX(O) 2024", price: 1485000, meta: "EMI ₹24,500/mo", href: buyListingPath("cars", "used"), image: FEATURED_VEHICLE_IMAGES.creta, badge: "Verified" },
      { type: "loan", title: "Loan offers", price: 1200000, meta: "HDFC · 8.9% p.a.", href: "/finance" },
      { type: "ai", title: "AI Car Assistant", subtitle: "12 SUVs under ₹15L in Mumbai", href: "/ai" },
    ],
    dashboardTags: ["Repo car auctions today", "Used listings"],
    ecosystemIds: ["new-cars", "used-cars", "auctions", "finance", "services"],
    categoryIds: ["new-cars", "used-cars", "ev"],
  },
  bikes: {
    label: "Bikes",
    headlineSuffix: "Scooters & motorcycles",
    primaryCta: { label: "Browse bikes", href: HUB_BUY_USED.bikes },
    secondaryCta: { label: "Sell your bike", href: "/sell" },
    browseFooter: "New & pre-owned bikes · parts · finance",
    insightsFoot: "Opens bike marketplace — two-wheelers only",
    pickCta: "View bike",
    brands: BIKE_BRANDS,
    budgets: ["Under ₹1L", "₹1L – ₹2L", "₹2L – ₹3L", "₹3L+"],
    fuels: ["Petrol", "Electric"],
    aiPicks: [
      { id: "b1", title: "Best commuter scooters", subtitle: "Activa · Jupiter · Access", query: "scooter commuter", mode: "bikes", badge: "Hot" },
      { id: "b2", title: "Royal Enfield deals", subtitle: "Classic & Hunter 350", query: "Royal Enfield", mode: "bikes", badge: "Trending" },
      { id: "b3", title: "Sports bikes under ₹3L", subtitle: "R15 · Duke · Apache", query: "sports bike under 3L", mode: "bikes", badge: "EMI" },
    ],
    trending: [
      { id: "bt1", title: "Activa 6G", subtitle: "Top scooter", query: "Activa 6G", mode: "bikes" },
      { id: "bt2", title: "Classic 350", subtitle: "Cruiser", query: "Classic 350", mode: "bikes" },
      { id: "bt3", title: "Pulsar NS200", subtitle: "Sports", query: "Pulsar NS200", mode: "bikes" },
    ],
    quickLinks: BIKE_QUICK,
    dashboard: [
      {
        type: "listing",
        title: "Activa 6G 2024",
        price: 89000,
        meta: "5,200 km · Pune",
        href: HUB_BUY_USED.bikes,
        image: getVehicleHero({ brand: "Honda", model: "Activa", bodyType: "Scooter", category: "bikes" }),
        badge: "Verified",
      },
      {
        type: "listing",
        title: "Classic 350 Chrome",
        price: 215000,
        meta: "Tripper nav · Delhi",
        href: HUB_BUY_USED.bikes,
        image: getVehicleHero({ brand: "Royal Enfield", model: "Classic 350", bodyType: "Bike", category: "bikes" }),
        badge: "Featured",
      },
      { type: "loan", title: "Two-wheeler loan", price: 150000, meta: "Bajaj Finance · 11.5%", href: "/finance" },
      { type: "ai", title: "AI Bike Picks", subtitle: "8 scooters under ₹1.2L", href: "/ai" },
    ],
    dashboardTags: ["Bike listings", "Two-wheeler finance"],
    ecosystemIds: ["bikes", "finance", "services"],
    categoryIds: ["bikes"],
  },
  trucks: {
    label: "Trucks",
    headlineSuffix: "LCV & commercial vehicles",
    primaryCta: { label: "Browse trucks", href: HUB_BUY_USED.trucks },
    secondaryCta: { label: "List commercial vehicle", href: "/sell" },
    browseFooter: "LCV · pickups · fleet finance",
    insightsFoot: "Commercial vehicle marketplace",
    pickCta: "View truck",
    brands: TRUCK_BRANDS,
    budgets: ["Under ₹10L", "₹10L – ₹25L", "₹25L – ₹50L", "₹50L+"],
    fuels: ["Diesel", "CNG", "Electric"],
    aiPicks: [
      { id: "tr1", title: "Tata Ace for last mile", subtitle: "CNG & diesel variants", query: "Tata Ace", mode: "trucks", badge: "LCV" },
      { id: "tr2", title: "Fleet-ready 407", subtitle: "Low maintenance", query: "Tata 407", mode: "trucks", badge: "Fleet" },
      { id: "tr3", title: "Electric LCV", subtitle: "EV incentives", query: "electric truck", mode: "trucks", badge: "EV" },
    ],
    trending: [
      { id: "tt1", title: "Tata Ace Gold", subtitle: "Last mile", query: "Tata Ace", mode: "trucks" },
      { id: "tt2", title: "Ashok Leyland Dost", subtitle: "Payload king", query: "Dost", mode: "trucks" },
    ],
    quickLinks: TRUCK_QUICK,
    dashboard: [
      {
        type: "listing",
        title: "Tata Ace HT+ CNG",
        price: 680000,
        meta: "42,000 km · Mumbai",
        href: HUB_BUY_USED.trucks,
        image: getVehicleHero({ brand: "Tata", model: "Ace", bodyType: "Truck", category: "trucks" }),
        badge: "Certified",
      },
      { type: "auction", title: "Repo Tata 407", price: 920000, meta: "Bids · ending soon", href: "/auctions", badge: "Auction", live: false },
      { type: "loan", title: "Commercial loan", price: 2500000, meta: "SBI · fleet rate", href: "/finance" },
      { type: "ai", title: "Fleet AI Advisor", subtitle: "Match payload to model", href: "/ai" },
    ],
    dashboardTags: ["Commercial listings", "Fleet auctions"],
    ecosystemIds: ["trucks", "auctions", "finance"],
    categoryIds: ["trucks"],
  },
  auto: {
    label: "Auto",
    headlineSuffix: "Passenger & cargo three-wheelers",
    primaryCta: { label: "Browse autos", href: HUB_BUY_USED.auto },
    secondaryCta: { label: "Sell auto", href: "/sell" },
    browseFooter: "Passenger · cargo · CNG",
    insightsFoot: "Auto rickshaw marketplace",
    pickCta: "View auto",
    brands: AUTO_BRANDS,
    budgets: ["Under ₹3L", "₹3L – ₹5L", "₹5L+"],
    fuels: ["CNG", "Petrol", "Diesel"],
    aiPicks: [
      { id: "a1", title: "Bajaj RE passenger", subtitle: "CNG ready", query: "Bajaj RE", mode: "auto", badge: "CNG" },
      { id: "a2", title: "Piaggio Ape cargo", subtitle: "Last-mile delivery", query: "Piaggio Ape", mode: "auto", badge: "Cargo" },
    ],
    trending: [
      { id: "at1", title: "Bajaj RE Maxima", subtitle: "Passenger", query: "Bajaj RE", mode: "auto" },
      { id: "at2", title: "Ape City", subtitle: "Cargo", query: "Ape City", mode: "auto" },
    ],
    quickLinks: AUTO_QUICK,
    dashboard: [
      {
        type: "listing",
        title: "Bajaj RE Compact CNG",
        price: 320000,
        meta: "28,000 km · Delhi",
        href: HUB_BUY_USED.auto,
        image: getVehicleHero({ brand: "Bajaj", model: "RE", bodyType: "Auto", category: "auto" }),
      },
      {
        type: "listing",
        title: "Piaggio Ape Xtra",
        price: 385000,
        meta: "Cargo · Ahmedabad",
        href: HUB_BUY_USED.auto,
        image: getVehicleHero({ brand: "Piaggio", model: "Ape", bodyType: "Auto", category: "auto", seed: 1 }),
      },
      { type: "loan", title: "Auto loan", price: 350000, meta: "Quick approval", href: "/finance" },
    ],
    dashboardTags: ["CNG autos · cargo variants"],
    ecosystemIds: ["finance", "services"],
    categoryIds: [],
  },
  buses: {
    label: "Buses",
    headlineSuffix: "Staff transport & coaches",
    primaryCta: { label: "Browse buses", href: HUB_BUY_USED.buses },
    secondaryCta: { label: "List bus", href: "/sell" },
    browseFooter: "Staff buses · luxury coaches",
    insightsFoot: "Bus & coach marketplace",
    pickCta: "View bus",
    brands: BUS_BRANDS,
    budgets: ["Under ₹15L", "₹15L – ₹30L", "₹30L+"],
    fuels: ["Diesel", "CNG"],
    aiPicks: [
      { id: "bu1", title: "26-seater staff bus", subtitle: "Force Traveller", query: "Force Traveller", mode: "buses", badge: "26 seat" },
      { id: "bu2", title: "Tata Winger fleet", subtitle: "Corporate shuttle", query: "Tata Winger", mode: "buses", badge: "Fleet" },
    ],
    trending: [
      { id: "but1", title: "Force Traveller 3350", subtitle: "Staff", query: "Traveller", mode: "buses" },
      { id: "but2", title: "Tata Winger", subtitle: "Executive", query: "Winger", mode: "buses" },
    ],
    quickLinks: BUS_QUICK,
    dashboard: [
      {
        type: "listing",
        title: "Force Traveller 26",
        price: 1850000,
        meta: "1.2L km · Chennai",
        href: HUB_BUY_USED.buses,
        image: getVehicleHero({ brand: "Force", model: "Traveller", bodyType: "Bus", category: "buses" }),
      },
      { type: "loan", title: "Fleet lease", price: 3500000, meta: "NBFC · 48 months", href: "/finance" },
      { type: "auction", title: "Repo coach bus", price: 2200000, meta: "Bids available", href: "/auctions", badge: "Auction", live: false },
    ],
    dashboardTags: ["Bus listings", "Fleet finance"],
    ecosystemIds: ["auctions", "finance"],
    categoryIds: ["buses"],
  },
  auctions: {
    label: "Auctions",
    headlineSuffix: "Live bidding on vehicles",
    primaryCta: { label: "View auctions", href: "/auctions" },
    secondaryCta: { label: "How auctions work", href: "/auctions" },
    browseFooter: "Cars · bikes · commercial · repo",
    insightsFoot: "Live & upcoming vehicle auctions",
    pickCta: "View auction",
    brands: [...CAR_BRANDS, ...TRUCK_BRANDS],
    budgets: ["Under ₹5L", "₹5L – ₹15L", "₹15L+"],
    fuels: ["Petrol", "Diesel", "Electric", "CNG"],
    aiPicks: [
      { id: "au1", title: "Bank repo ending today", subtitle: "Up to 30% off", query: "bank repo", mode: "auctions", badge: "Live" },
      { id: "au2", title: "Fleet disposal lots", subtitle: "Commercial vehicles", query: "fleet auction", mode: "auctions", badge: "Fleet" },
      { id: "au3", title: "Insurance salvage SUVs", subtitle: "Repairable", query: "salvage SUV", mode: "auctions", badge: "SUV" },
    ],
    trending: [
      { id: "aut1", title: "Honda City repo", subtitle: "Ends 4h", query: "Honda City auction", mode: "auctions" },
      { id: "aut2", title: "Creta fleet lot", subtitle: "12 units", query: "Creta auction", mode: "auctions" },
    ],
    quickLinks: AUCTION_QUICK,
    dashboard: [
      { type: "auction", title: "2019 Honda City VX", price: 782000, meta: "Ending soon · bids", href: "/auctions", badge: "Auction", live: false },
      { type: "auction", title: "Repo Tata Nexon", price: 620000, meta: "Bids · Mumbai", href: "/auctions", badge: "Auction", live: false },
      { type: "stats", title: "Auction listings", subtitle: "Ending today", href: "/auctions" },
    ],
    dashboardTags: ["Repo auctions", "Transparent bidding"],
    ecosystemIds: ["auctions"],
    categoryIds: [],
  },
  finance: {
    label: "Finance",
    headlineSuffix: "Loans & instant eligibility",
    primaryCta: { label: "Compare loans", href: "/finance/compare" },
    secondaryCta: { label: "Check eligibility", href: "/finance" },
    browseFooter: "Car · bike · commercial loans",
    insightsFoot: "Compare 14+ banks & NBFCs",
    pickCta: "Check rate",
    brands: CAR_BRANDS,
    budgets: ["₹3L loan", "₹8L loan", "₹15L loan", "₹25L+"],
    fuels: [],
    aiPicks: [
      { id: "f1", title: "Lowest car loan rate", subtitle: "SBI vs HDFC vs ICICI", query: "car loan rate", mode: "finance", badge: "8.5%" },
      { id: "f2", title: "Eligibility check", subtitle: "Soft check · no impact", query: "loan eligibility", mode: "finance", badge: "Fast" },
      { id: "f3", title: "Bike EMI under ₹3K", subtitle: "Two-wheeler loans", query: "bike EMI", mode: "finance", badge: "Bike" },
    ],
    trending: [
      { id: "ft1", title: "SBI car loan", subtitle: "8.5% from", query: "SBI car loan", mode: "finance" },
      { id: "ft2", title: "HDFC eligibility", subtitle: "Fast approval", query: "HDFC loan", mode: "finance" },
    ],
    quickLinks: FINANCE_QUICK,
    dashboard: [
      { type: "loan", title: "Loan offers", price: 1200000, meta: "HDFC · 8.9% · approval", href: "/finance" },
      { type: "loan", title: "Bike loan approved", price: 150000, meta: "Bajaj Finance · 11.5%", href: "/finance" },
      { type: "stats", title: "₹1200Cr+ disbursed", subtitle: "14 lender partners", href: "/finance/compare" },
    ],
    dashboardTags: ["Lender comparison", "Eligibility check"],
    ecosystemIds: ["finance"],
    categoryIds: [],
  },
};

export function getHeroHubConfig(mode: HeroSearchMode): HeroHubConfig {
  return HERO_HUB_CONFIG[mode];
}

/** Homepage hero panel — balanced Phase 1 (cars, auction, finance, community) */
export function getHomeHeroDashboard(): {
  cards: HeroDashboardCard[];
  tags: string[];
  panelTitle: string;
} {
  return {
    cards: PHASE1_ECOSYSTEM_DASHBOARD,
    tags: [...PHASE1_DASHBOARD_TAGS],
    panelTitle: "India vehicle ecosystem",
  };
}

export type HomeSectionKey =
  | "hubQuickLinks"
  | "trustBand"
  | "ecosystem"
  | "featuredVehicles"
  | "aiRecommendations"
  | "newCars"
  | "preowned"
  | "categories"
  | "auctions"
  | "finance"
  | "banks"
  | "services"
  | "parts"
  | "ai"
  | "dealer"
  | "community"
  | "stats"
  | "testimonials"
  | "appDownload";

export function getHomeSectionVisibility(mode: HeroSearchMode): Record<HomeSectionKey, boolean> {
  const base: Record<HomeSectionKey, boolean> = {
    hubQuickLinks: true,
    trustBand: true,
    ecosystem: true,
    featuredVehicles: true,
    aiRecommendations: true,
    newCars: false,
    preowned: false,
    categories: true,
    auctions: true,
    finance: true,
    banks: true,
    services: true,
    parts: true,
    ai: true,
    dealer: true,
    community: true,
    stats: true,
    testimonials: true,
    appDownload: true,
  };

  switch (mode) {
    case "cars":
      return { ...base, newCars: true, preowned: true };
    case "bikes":
      return { ...base, newCars: false, preowned: false, categories: true };
    case "trucks":
      return { ...base, parts: true, services: true };
    case "auto":
      return { ...base, preowned: true };
    case "buses":
      return { ...base, parts: false };
    case "auctions":
      return {
        ...base,
        featuredVehicles: false,
        aiRecommendations: false,
        newCars: false,
        preowned: false,
        parts: false,
        services: false,
        categories: false,
        finance: false,
        banks: false,
      };
    case "finance":
      return {
        ...base,
        featuredVehicles: false,
        newCars: false,
        preowned: false,
        parts: false,
        services: false,
        auctions: false,
        categories: false,
        ecosystem: true,
      };
    default:
      return base;
  }
}
