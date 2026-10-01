import type { LucideIcon } from "lucide-react";
import {
  Car,
  Truck,
  Tractor,
  Gem,
  Building2,
  Bike,
  Bus,
  Gavel,
  Smartphone,
  Monitor,
  Handshake,
  ParkingCircle,
  FileText,
  TruckIcon,
  Landmark,
  Shield,
} from "lucide-react";
import {
  dealerCoverImage,
  HUB_HERO_IMAGES,
  MEDIA_DEFAULTS,
} from "@/lib/media/india-media-catalog";

export type AuctionServiceId =
  | "physical"
  | "online"
  | "phygital"
  | "private-treaty"
  | "parking"
  | "documentation"
  | "logistics"
  | "financial"
  | "insurance";

export interface AuctionServiceItem {
  id: AuctionServiceId;
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

export const AUCTION_SERVICES: AuctionServiceItem[] = [
  { id: "physical", label: "Physical Bidding", description: "On-yard live gavel", icon: Gavel, href: "/auctions/browse?mode=physical" },
  { id: "online", label: "Online Bidding", description: "Bid from anywhere", icon: Smartphone, href: "/auctions/browse?mode=online" },
  { id: "phygital", label: "Phygital Bidding", description: "Yard + digital", icon: Monitor, href: "/auctions/browse?mode=phygital" },
  { id: "private-treaty", label: "Private Treaty", description: "Direct negotiated sale", icon: Handshake, href: "/auctions/browse?type=dealer" },
  { id: "parking", label: "Parking Services", description: "Secure vehicle storage", icon: ParkingCircle, href: "/services" },
  { id: "documentation", label: "Documentation", description: "RC, NOC & transfer", icon: FileText, href: "/services" },
  { id: "logistics", label: "Logistics", description: "Pan-India transport", icon: TruckIcon, href: "/services" },
  { id: "financial", label: "Financial Services", description: "Loans & refinance", icon: Landmark, href: "/finance" },
  { id: "insurance", label: "Insurance", description: "Auction cover & renewals", icon: Shield, href: "/insurance" },
];

export type AuctionAssetCategoryId =
  | "commercial"
  | "cars"
  | "tractors"
  | "two-wheelers"
  | "buses"
  | "construction"
  | "gold"
  | "real-estate";

export interface AuctionAssetCategory {
  id: AuctionAssetCategoryId;
  label: string;
  subtitle: string;
  image: string;
  href: string;
}

export const AUCTION_ASSET_CATEGORIES: AuctionAssetCategory[] = [
  {
    id: "commercial",
    label: "Commercial Vehicles",
    subtitle: "Trucks, tippers & CV fleets",
    image: HUB_HERO_IMAGES.trucks,
    href: "/auctions/browse?category=commercial",
  },
  {
    id: "cars",
    label: "4 Wheelers",
    subtitle: "Cars, SUVs & MUVs",
    image: HUB_HERO_IMAGES.cars,
    href: "/auctions/browse?category=cars",
  },
  {
    id: "tractors",
    label: "Tractors & Farm",
    subtitle: "Agri & harvest equipment",
    image: HUB_HERO_IMAGES.equipment,
    href: "/auctions/browse?category=tractors",
  },
  {
    id: "two-wheelers",
    label: "2 Wheelers",
    subtitle: "Bikes & scooters",
    image: HUB_HERO_IMAGES.bikes,
    href: "/auctions/browse?category=two-wheelers",
  },
  {
    id: "buses",
    label: "Buses & Coaches",
    subtitle: "Staff & tourist coaches",
    image: HUB_HERO_IMAGES.buses,
    href: "/auctions/browse?category=buses",
  },
  {
    id: "construction",
    label: "Construction Equipment",
    subtitle: "JCB, cranes & mixers",
    image: HUB_HERO_IMAGES.equipment,
    href: "/auctions/browse?category=construction",
  },
  {
    id: "gold",
    label: "Gold & Assets",
    subtitle: "Bank pledged assets",
    image: MEDIA_DEFAULTS.finance,
    href: "/auctions/browse?category=gold",
  },
  {
    id: "real-estate",
    label: "Real Estate",
    subtitle: "Plots & commercial space",
    image: MEDIA_DEFAULTS.dealerCover,
    href: "/auctions/browse?category=real-estate",
  },
];

export const AUCTION_HUB_STATES = [
  "All States",
  "Andhra Pradesh",
  "Delhi NCR",
  "Gujarat",
  "Karnataka",
  "Kerala",
  "Maharashtra",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "West Bengal",
] as const;

export const AUCTION_CATEGORY_ICONS: Record<string, LucideIcon> = {
  car: Car,
  truck: Truck,
  tractor: Tractor,
  bike: Bike,
  bus: Bus,
  gold: Gem,
  building: Building2,
};

export interface AuctionEvent {
  id: string;
  slug: string;
  city: string;
  state: string;
  mode: "phygital" | "online" | "physical";
  venueName: string;
  yardImage: string;
  vehicleCount: number;
  catalogueUrl: string;
  startsAt: string;
  endsAt: string;
  status: "live" | "upcoming";
  categoryKeys: Array<keyof typeof AUCTION_CATEGORY_ICONS>;
  featuredAuctionSlug?: string;
}

export const MOCK_AUCTION_EVENTS: AuctionEvent[] = [
  {
    id: "ev-mumbai",
    slug: "mumbai-phygital-may",
    city: "Mumbai",
    state: "Maharashtra",
    mode: "phygital",
    venueName: "Motorcart Yard — Turbhe",
    yardImage: dealerCoverImage("yard-mumbai", 0),
    vehicleCount: 186,
    catalogueUrl: "#catalogue-mumbai",
    startsAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    endsAt: new Date(Date.now() + 5 * 3600000).toISOString(),
    status: "live",
    categoryKeys: ["car", "truck", "bike"],
    featuredAuctionSlug: "2023-hyundai-creta-bank-repo-mumbai",
  },
  {
    id: "ev-delhi",
    slug: "delhi-online-week",
    city: "Delhi NCR",
    state: "Delhi NCR",
    mode: "online",
    venueName: "Digital auction hall",
    yardImage: dealerCoverImage("yard-delhi", 1),
    vehicleCount: 142,
    catalogueUrl: "#catalogue-delhi",
    startsAt: new Date(Date.now() - 1 * 3600000).toISOString(),
    endsAt: new Date(Date.now() + 6 * 3600000).toISOString(),
    status: "live",
    categoryKeys: ["car", "bike"],
    featuredAuctionSlug: "2020-kia-seltos-dealer-auction-delhi",
  },
  {
    id: "ev-bangalore",
    slug: "bangalore-govt-fleet",
    city: "Bengaluru",
    state: "Karnataka",
    mode: "phygital",
    venueName: "Motorcart Hub — Hosur Road",
    yardImage: dealerCoverImage("yard-bangalore", 2),
    vehicleCount: 98,
    catalogueUrl: "#catalogue-bangalore",
    startsAt: new Date(Date.now() + 20 * 3600000).toISOString(),
    endsAt: new Date(Date.now() + 44 * 3600000).toISOString(),
    status: "upcoming",
    categoryKeys: ["car", "bus"],
    featuredAuctionSlug: "2019-maruti-swift-government-bangalore",
  },
  {
    id: "ev-pune",
    slug: "pune-dealer-mega",
    city: "Pune",
    state: "Maharashtra",
    mode: "physical",
    venueName: "Chakan auction ground",
    yardImage: dealerCoverImage("yard-chennai", 3),
    vehicleCount: 74,
    catalogueUrl: "#catalogue-pune",
    startsAt: new Date(Date.now() + 48 * 3600000).toISOString(),
    endsAt: new Date(Date.now() + 72 * 3600000).toISOString(),
    status: "upcoming",
    categoryKeys: ["car", "tractor"],
    featuredAuctionSlug: "2024-tata-nexon-ev-upcoming",
  },
  {
    id: "ev-chennai",
    slug: "chennai-bank-repo",
    city: "Chennai",
    state: "Tamil Nadu",
    mode: "phygital",
    venueName: "Ambattur industrial estate",
    yardImage: dealerCoverImage("yard-pune", 4),
    vehicleCount: 121,
    catalogueUrl: "#catalogue-chennai",
    startsAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    endsAt: new Date(Date.now() + 4 * 3600000).toISOString(),
    status: "live",
    categoryKeys: ["car", "truck", "bus"],
  },
  {
    id: "ev-hyderabad",
    slug: "hyderabad-cv-auction",
    city: "Hyderabad",
    state: "Telangana",
    mode: "online",
    venueName: "Cloud bidding room",
    yardImage: dealerCoverImage("yard-hyderabad", 5),
    vehicleCount: 63,
    catalogueUrl: "#catalogue-hyderabad",
    startsAt: new Date(Date.now() + 12 * 3600000).toISOString(),
    endsAt: new Date(Date.now() + 36 * 3600000).toISOString(),
    status: "upcoming",
    categoryKeys: ["truck", "bus"],
  },
];
