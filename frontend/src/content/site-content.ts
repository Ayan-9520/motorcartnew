import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Car,
  Gavel,
  Landmark,
  Shield,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";

/** Central copy & contact data for public marketing pages, footer, and SEO. */
export const SITE_CONTACT = {
  email: "info@motorcart.in",
  supportEmail: "support@motorcart.in",
  phoneDisplay: "+91 79829 53129",
  phoneTel: "917982953129",
  addressLine1: "Plot No. 526, II Floor",
  addressLine2: "Patparganj Industrial Area, New Delhi — 110092",
  address: "Plot No. 526, II Floor, Patparganj Industrial Area, New Delhi — 110092",
  addressShort: "New Delhi, India",
  hours: "Mon–Sat, 9:00 AM – 7:00 PM IST",
  responseTime: "We reply within one business day",
} as const;

export const SITE_STATS = [
  { value: "Verified dealer network", label: "Dealer partners" },
  { value: "Lender ecosystem", label: "Lender integrations" },
  { value: "Owner community", label: "Community" },
  { value: "Pan-India coverage", label: "Cities" },
] as const;

/** One-line trust strip for homepage hero */
export const SITE_STATS_BAR =
  "Verified dealers · lender ecosystem · owner community · auction marketplace";

export const SITE_DESCRIPTION =
  "Buy, sell, finance, insure, and service vehicles across India — cars, bikes, trucks, EVs, auctions, parts, and dealer tools on one AI-powered platform.";

export const CONTACT_TOPICS = [
  { value: "general", label: "General inquiry" },
  { value: "dealer", label: "Dealer onboarding" },
  { value: "finance", label: "Finance / NBFC partnership" },
  { value: "insurance", label: "Insurance partner" },
  { value: "press", label: "Press & media" },
  { value: "support", label: "Technical support" },
] as const;

export type AboutPillar = {
  icon: LucideIcon;
  title: string;
  text: string;
};

export const ABOUT_PILLARS: AboutPillar[] = [
  {
    icon: Car,
    title: "Buy & sell every vehicle",
    text: "Cars, bikes, trucks, buses, auto & EV — verified listings, fair pricing, and dealer CRM in one marketplace.",
  },
  {
    icon: Landmark,
    title: "Bank-grade finance",
    text: "Loan applications, DSA workflows, EMI tools, and lender integrations built for Indian automotive retail.",
  },
  {
    icon: Gavel,
    title: "Live auctions",
    text: "Transparent bidding for dealers, fleets, and repossessed inventory with real-time status and approvals.",
  },
  {
    icon: Users,
    title: "Owner community",
    text: "Reviews, photos, and discussions on a social layer separate from dealer and partner workspaces.",
  },
  {
    icon: Wrench,
    title: "Parts & service",
    text: "Workshop bookings, parts catalog, technician jobs, and FASTag-style ownership tools for customers.",
  },
  {
    icon: Bot,
    title: "AI across the stack",
    text: "Search, recommendations, moderation, and role-aware assistants tuned for automotive India.",
  },
];

export const ABOUT_TRUST_POINTS = [
  "Role-based workspaces — Customer OS, Dealer OS, Finance, Parts, Service & Admin",
  "Separate community identity from business account and KYC settings",
  "AI-assisted moderation with human review for community safety",
] as const;

export const ABOUT_MISSION =
  "Make buying, selling, financing, and servicing vehicles in India as transparent and intelligent as ordering anything else online — with dealers and owners both winning.";

export const FOOTER_COLUMNS = [
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Press", href: "/press" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Marketplace",
    links: [
      { label: "Buy vehicles", href: "/buy" },
      { label: "Sell your vehicle", href: "/sell" },
      { label: "Live auctions", href: "/auctions" },
      { label: "Find dealers", href: "/dealers" },
    ],
  },
  {
    title: "Finance",
    links: [
      { label: "Finance hub", href: "/finance" },
      { label: "Compare loans", href: "/finance/compare" },
      { label: "Insurance", href: "/insurance" },
      { label: "EMI calculator", href: "/finance/tools" },
    ],
  },
  {
    title: "Ownership",
    links: [
      { label: "Parts marketplace", href: "/parts" },
      { label: "Book service", href: "/services" },
      { label: "Community", href: "/community" },
      { label: "AI assistant", href: "/ai" },
    ],
  },
  {
    title: "Partners",
    links: [
      { label: "Dealer signup", href: "/signup?role=dealer" },
      { label: "DSA portal", href: "/dashboard/dsa" },
      { label: "Service partners", href: "/signup?role=service_center" },
      { label: "Parts suppliers", href: "/signup?role=parts_seller" },
    ],
  },
  {
    title: "Policies & help",
    links: [
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms of service", href: "/terms" },
      { label: "FAQs", href: "/faqs" },
    ],
  },
] as const;

/** Footer bottom bar — same legal pages (visible on every screen size). */
export const FOOTER_LEGAL_LINKS = [
  { label: "Privacy policy", href: "/privacy" },
  { label: "Terms of service", href: "/terms" },
  { label: "FAQs", href: "/faqs" },
] as const;
