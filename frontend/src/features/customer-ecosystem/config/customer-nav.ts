import type { LucideIcon } from "lucide-react";
import {
  Award,
  BarChart3,
  Bell,
  Calendar,
  Car,
  CreditCard,
  FileText,
  Gauge,
  Gavel,
  Heart,
  Landmark,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Shield,
  Sparkles,
  User,
  Users,
  Wallet,
  Wrench,
  Zap,
  ClipboardList,
  Search,
  Settings,
  Star,
} from "lucide-react";

export type CustomerNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  /** In-page section on account page (e.g. notifications) */
  hash?: string;
};

export type CustomerNavGroup = {
  label: string;
  items: CustomerNavItem[];
};

/** Premium grouped customer sidebar — ownership super app */
export const CUSTOMER_ECOSYSTEM_NAV: CustomerNavGroup[] = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard/customer", label: "Dashboard Home", icon: LayoutDashboard, end: true },
      { to: "/dashboard/customer/one", label: "MotorCart One", icon: CreditCard },
      { to: "/dashboard/customer/insights", label: "Ownership alerts", icon: Bell },
      { to: "/dashboard/customer/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "My Garage",
    items: [
      { to: "/dashboard/customer/garage", label: "My Vehicles", icon: Car },
      { to: "/dashboard/customer/garage/add", label: "Add Vehicle", icon: Plus },
      { to: "/dashboard/customer/documents", label: "RC & Documents", icon: FileText },
      { to: "/dashboard/customer/insurance-wallet", label: "Insurance Wallet", icon: Shield },
      { to: "/dashboard/customer/fastag", label: "FASTag", icon: Zap },
      { to: "/dashboard/customer/service-records", label: "Service Records", icon: Wrench },
      { to: "/dashboard/customer/vehicle-health", label: "Vehicle Health", icon: Gauge },
    ],
  },
  {
    label: "Finance",
    items: [
      { to: "/dashboard/customer/loans", label: "Loan Applications", icon: Landmark },
      { to: "/dashboard/customer/loans", label: "EMI Tracker", icon: CreditCard },
      { to: "/dashboard/customer/quotations", label: "My Quotations", icon: FileText },
      { to: "/dashboard/customer/test-drives", label: "My Test Drives", icon: Calendar },
      { to: "/finance/tools", label: "Credit Score", icon: BarChart3 },
      { to: "/finance/tools", label: "Eligibility Checker", icon: Sparkles },
    ],
  },
  {
    label: "Marketplace",
    items: [
      { to: "/wishlist", label: "Saved Vehicles", icon: Heart },
      { to: "/dashboard/customer/saved-searches", label: "Saved Searches", icon: Search },
      { to: "/dashboard/customer/reminders", label: "Reminders", icon: Calendar },
      { to: "/dashboard/customer/activity", label: "Activity", icon: BarChart3 },
      { to: "/dashboard/customer/sell", label: "Sell My Vehicle", icon: Gavel },
      { to: "/dashboard/customer/recently-viewed", label: "Recently Viewed", icon: Search },
      { to: "/vehicles/compare", label: "Compare Vehicles", icon: Car },
      { to: "/auctions/browse", label: "Auctions & Bids", icon: Gavel },
    ],
  },
  {
    label: "Services",
    items: [
      { to: "/services/my-bookings", label: "Service Bookings", icon: ClipboardList },
      { to: "/services", label: "Car Spa", icon: Sparkles },
      { to: "/parts", label: "Tyres & Battery", icon: Wrench },
      { to: "/services/browse", label: "RSA / Breakdown", icon: Shield },
    ],
  },
  {
    label: "Community",
    items: [
      { to: "/community", label: "Community Feed", icon: MessageSquare },
      { to: "/community/groups", label: "Groups", icon: Users },
      { to: "/community", label: "Reviews", icon: Star },
      { to: "/community", label: "Discussions", icon: MessageSquare },
    ],
  },
  {
    label: "Account",
    items: [
      { to: "/dashboard/customer/profile", label: "Account", icon: User, end: true },
      { to: "/dashboard/customer/profile", hash: "security", label: "Security & KYC", icon: Shield },
      { to: "/dashboard/customer/profile", hash: "notifications", label: "Notifications", icon: Bell },
      { to: "/dashboard/customer/rewards", label: "Loyalty & Rewards", icon: Award },
    ],
  },
];
