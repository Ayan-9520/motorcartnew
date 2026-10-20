import type { PhotoAngle } from "@/lib/photo-angles";

export type BrochureTemplateId =
  | "feature_highlights"
  | "comparison"
  | "used_sales"
  | "finance_offer"
  | "social_post"
  | "specification"
  | "lifestyle"
  | "custom";

export type PosterSize = "portrait" | "square" | "story";

export const POSTER_SIZES: Record<PosterSize, { label: string; width: number; height: number; hint: string }> = {
  portrait: { label: "Post 4:5", width: 1080, height: 1350, hint: "WhatsApp, Instagram & Facebook feed" },
  square: { label: "Square 1:1", width: 1080, height: 1080, hint: "Instagram grid, Facebook, OLX" },
  story: { label: "Story 9:16", width: 1080, height: 1920, hint: "WhatsApp Status, Instagram & FB Stories" },
};

export type BrochureSpec = { key: string; label: string; value: string };

export type BrochureVehicle = {
  id: string;
  title: string;
  brand: string;
  model: string;
  variant: string;
  year: number;
  condition: "new" | "used";
  price: number;
  priceOnRequest: boolean;
  fuel: string;
  transmission: string;
  bodyType: string;
  kms: number;
  owners: number;
  color: string;
  city: string;
  state: string;
  registration: string;
  insuranceValid: string;
  isCertified: boolean;
  specs: BrochureSpec[];
  features: string[];
  images: string[];
  angles: Record<string, PhotoAngle>;
  listingPath: string;
};

export type BrochureContent = {
  headline: string;
  tagline: string;
  priceText: string;
  priceNote: string;
  features: string[];
  trustBadges: string[];
  ctaText: string;
  offerBadge: string;
  bodyText: string;
  downPayment: number;
  interestRate: number;
  tenureMonths: number;
};

export type BrochureBranding = {
  dealerName: string;
  dealerTagline: string;
  phone: string;
  city: string;
  services: string;
  logoUrl: string;
  showDealerLogo: boolean;
  showContact: boolean;
  showWatermark: boolean;
  showQr: boolean;
};

export type BrochureColors = { preset: string; primary: string; accent: string; dark: string };

export type BrochureImageSelection = {
  heroUrl: string;
  secondaryUrl: string;
  galleryUrls: string[];
  compareHeroUrl: string;
};

export type BrochureDesign = {
  template: BrochureTemplateId;
  size: PosterSize;
  content: BrochureContent;
  branding: BrochureBranding;
  colors: BrochureColors;
  images: BrochureImageSelection;
};

export const TEMPLATE_META: Record<
  BrochureTemplateId,
  { name: string; short: string; group: "new" | "used" | "comparison" | "offers" | "social" | "all"; needsCompare?: boolean }
> = {
  feature_highlights: { name: "Feature Highlights", short: "10 reasons to choose", group: "new" },
  comparison: { name: "Comparison Poster", short: "Car vs car spec table", group: "comparison", needsCompare: true },
  used_sales: { name: "Used Car Sales Card", short: "Photos, specs & trust badges", group: "used" },
  finance_offer: { name: "Finance & Offer", short: "EMI, down payment, offers", group: "offers" },
  social_post: { name: "Social Media Post", short: "Bold photo + price", group: "social" },
  specification: { name: "Specification Sheet", short: "Full spec & features list", group: "all" },
  lifestyle: { name: "Lifestyle Poster", short: "Full-photo mood poster", group: "social" },
  custom: { name: "Custom Template", short: "Your headline & points", group: "all" },
};

export const COLOR_PRESETS: BrochureColors[] = [
  { preset: "motorcart", primary: "#0b2a5b", accent: "#f5a524", dark: "#071a3a" },
  { preset: "showroom_blue", primary: "#1d4ed8", accent: "#facc15", dark: "#0b1f4b" },
  { preset: "emerald", primary: "#047857", accent: "#f59e0b", dark: "#05291f" },
  { preset: "royal_red", primary: "#b91c1c", accent: "#fbbf24", dark: "#3b0a0a" },
  { preset: "black_gold", primary: "#111827", accent: "#d4a537", dark: "#030712" },
  { preset: "ev_teal", primary: "#0f766e", accent: "#22d3ee", dark: "#042f2e" },
];

export const PRESET_LABELS: Record<string, string> = {
  motorcart: "MotorCart Navy",
  showroom_blue: "Showroom Blue",
  emerald: "Emerald",
  royal_red: "Royal Red",
  black_gold: "Black & Gold",
  ev_teal: "EV Teal",
  custom: "Custom",
};
