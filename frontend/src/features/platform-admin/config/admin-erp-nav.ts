import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  Bell,
  Bot,
  Car,
  ClipboardCheck,
  CreditCard,
  GitBranch,
  FileText,
  Gavel,
  Image,
  Landmark,
  LayoutDashboard,
  LayoutTemplate,
  LifeBuoy,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  Waypoints,
  BadgeIndianRupee,
  LineChart,
  Route,
} from "lucide-react";

export type AdminErpNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
};

export type AdminErpNavGroup = {
  label?: string;
  items: AdminErpNavItem[];
};

/** Enterprise admin ERP navigation (Razorpay / Stripe style control plane) */
export const ADMIN_ERP_NAV: AdminErpNavGroup[] = [
  {
    items: [
      { to: "/dashboard/super-admin", label: "Command center", icon: LayoutDashboard, end: true },
      { to: "/dashboard/super-admin/founder", label: "Founder dashboard", icon: LineChart },
      { to: "/dashboard/super-admin/lead-router", label: "Lead router", icon: Route },
      { to: "/dashboard/super-admin/marketplace-leads", label: "Marketplace leads", icon: Users },
      { to: "/dashboard/super-admin/operations", label: "How it works", icon: GitBranch },
    ],
  },
  {
    label: "Approvals",
    items: [
      {
        to: "/dashboard/super-admin/business-approvals",
        label: "Business accounts",
        icon: ClipboardCheck,
      },
      { to: "/dashboard/super-admin/finance-approvals", label: "Fintech / loans", icon: Landmark },
      { to: "/dashboard/super-admin/users", label: "User management", icon: Users },
      { to: "/dashboard/super-admin/dealers", label: "Dealer verification", icon: Store },
      { to: "/dashboard/super-admin/kyc", label: "KYC queue", icon: ShieldCheck },
      { to: "/dashboard/super-admin/roles", label: "Role directory", icon: Waypoints },
    ],
  },
  {
    label: "Marketplace",
    items: [
      { to: "/dashboard/super-admin/vehicles", label: "Vehicle moderation", icon: Car },
      { to: "/dashboard/super-admin/featured", label: "Featured inventory", icon: Sparkles },
      {
        to: "/dashboard/super-admin/directory-monetization",
        label: "Directory monetization",
        icon: BadgeIndianRupee,
      },
      { to: "/dashboard/super-admin/auctions", label: "Auction approvals", icon: Gavel },
    ],
  },
  {
    label: "Risk & compliance",
    items: [{ to: "/dashboard/super-admin/fraud", label: "Fraud detection", icon: AlertTriangle }],
  },
  {
    label: "Revenue",
    items: [
      { to: "/dashboard/super-admin/analytics", label: "Revenue analytics", icon: BarChart3 },
      { to: "/dashboard/super-admin/transactions", label: "All transactions", icon: ArrowLeftRight },
      { to: "/dashboard/super-admin/subscriptions", label: "Subscriptions", icon: CreditCard },
      { to: "/dashboard/super-admin/reports", label: "Reports", icon: FileText },
    ],
  },
  {
    label: "Content",
    items: [
      { to: "/dashboard/super-admin/cms", label: "CMS", icon: LayoutTemplate },
      { to: "/dashboard/super-admin/banners", label: "Banners", icon: Image },
    ],
  },
  {
    label: "Engagement",
    items: [{ to: "/dashboard/super-admin/notifications", label: "Push & campaigns", icon: Bell }],
  },
  {
    label: "Operations",
    items: [
      { to: "/dashboard/super-admin/tickets", label: "Support", icon: LifeBuoy },
      { to: "/dashboard/super-admin/ai", label: "AI controls", icon: Bot },
    ],
  },
];

/** Flat list for mobile nav */
export const ADMIN_ERP_NAV_FLAT: AdminErpNavItem[] = ADMIN_ERP_NAV.flatMap((g) => g.items);
