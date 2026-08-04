import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  Bell,
  Calendar,
  Car,
  FileQuestion,
  FileSpreadsheet,
  Gavel,
  Heart,
  Landmark,
  LayoutDashboard,
  MessageSquare,
  Package,
  Phone,
  Search,
  Settings,
  Shield,
  Store,
  UserCog,
  Users,
  Wrench,
  ClipboardList,
  Crown,
  Plug,
  Gauge,
  UserPlus,
} from "lucide-react";
import type { AppRole } from "@/types/database";
import { isDealerRole } from "@/permissions/role-matching";

export type RoleNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
};

export type RoleNavContext = {
  title: string;
  subtitle?: string;
  items: RoleNavItem[];
};

export function getRoleNavContext(role: AppRole): RoleNavContext {
  if (role === "super_admin" || role === "admin") {
    return {
      title: "Admin ERP",
      subtitle: role === "super_admin" ? "Super admin" : "Operations",
      items: [
        { to: "/dashboard/super-admin", label: "Command center", icon: LayoutDashboard, end: true },
        { to: "/dashboard/super-admin/users", label: "Users", icon: Users },
        { to: "/dashboard/super-admin/dealers", label: "Dealers", icon: Store },
        { to: "/dashboard/super-admin/vehicles", label: "Listings", icon: Car },
        { to: "/dashboard/super-admin/fraud", label: "Fraud", icon: Shield },
        { to: "/dashboard/super-admin/analytics", label: "Revenue", icon: BarChart3 },
        { to: "/dashboard/super-admin/transactions", label: "Transactions", icon: Landmark },
        { to: "/dashboard/super-admin/notifications", label: "Push", icon: MessageSquare },
        { to: "/dashboard/super-admin/auction-desk", label: "Auction desk", icon: Gavel },
      ],
    };
  }

  if (role === "new_car_dealer") {
    return {
      title: "New Car OS",
      subtitle: "Showroom",
      items: [
        { to: "/dashboard/new-car", label: "Showroom home", icon: LayoutDashboard, end: true },
        { to: "/dashboard/new-car/inventory", label: "Inventory", icon: Car },
        { to: "/dashboard/new-car/leads", label: "Lead CRM", icon: Users },
      ],
    };
  }

  if (isDealerRole(role)) {
    return {
      title: "Dealer OS",
      subtitle: "Enterprise CRM",
      items: [
        { to: "/dashboard/dealer", label: "Dashboard", icon: LayoutDashboard, end: true },
        { to: "/dashboard/dealer/inventory", label: "Inventory", icon: Car },
        { to: "/dashboard/dealer/inventory/excel", label: "Bulk upload", icon: FileSpreadsheet },
        { to: "/dashboard/dealer/leads", label: "Lead CRM", icon: Users },
        { to: "/dashboard/dealer/enquiries", label: "Enquiries", icon: FileQuestion },
        { to: "/dashboard/dealer/finance", label: "Finance", icon: Landmark },
        { to: "/dashboard/dealer/auctions", label: "Auctions", icon: Gavel },
        { to: "/dashboard/dealer/whatsapp", label: "WhatsApp", icon: MessageSquare },
        { to: "/dashboard/dealer/calls", label: "Calls", icon: Phone },
        { to: "/dashboard/dealer/analytics", label: "Analytics", icon: BarChart3 },
        { to: "/dashboard/dealer/team", label: "Team", icon: UserCog },
        { to: "/dashboard/dealer/verification", label: "Verification", icon: Shield },
        { to: "/dashboard/dealer/subscription", label: "Plans", icon: Crown },
        { to: "/dashboard/dealer/storefront", label: "Storefront", icon: Store },
        { to: "/dashboard/dealer/settings", label: "Settings", icon: Settings },
      ],
    };
  }

  if (role === "customer") {
    return {
      title: "Motorcart",
      subtitle: "Ownership OS",
      items: [
        { to: "/dashboard/customer", label: "Dashboard Home", icon: LayoutDashboard, end: true },
        { to: "/dashboard/customer/garage", label: "My Garage", icon: Car },
        { to: "/dashboard/customer/insights", label: "AI Insights", icon: Bot },
        { to: "/dashboard/customer/notifications", label: "Notifications", icon: Bell },
        { to: "/dashboard/customer/profile", label: "Account", icon: Settings },
      ],
    };
  }

  if (role === "dsa_agent") {
    return {
      title: "DSA workspace",
      subtitle: "Fintech desk",
      items: [
        { to: "/dashboard/dsa", label: "Overview", icon: LayoutDashboard, end: true },
        { to: "/dashboard/dsa/applications", label: "Applications", icon: Landmark },
        { to: "/dashboard/dsa/leads", label: "Lead CRM", icon: Gauge },
        { to: "/dashboard/dsa/integrations", label: "Bank APIs", icon: Plug },
        { to: "/dashboard/dsa/team", label: "Team", icon: UserPlus },
        { to: "/finance/offers", label: "Loan marketplace", icon: Store },
      ],
    };
  }

  if (role === "service_center") {
    return {
      title: "Service partner",
      subtitle: "Garage hub",
      items: [
        { to: "/dashboard/service", label: "Overview", icon: LayoutDashboard, end: true },
        { to: "/dashboard/service/calendar", label: "Calendar", icon: Calendar },
        { to: "/dashboard/service/bookings", label: "Bookings", icon: Wrench },
        { to: "/dashboard/service/analytics", label: "Analytics", icon: BarChart3 },
        { to: "/dashboard/service/settings", label: "Profile & pricing", icon: Settings },
      ],
    };
  }

  if (role === "service_technician") {
    return {
      title: "Technician",
      subtitle: "Jobs",
      items: [
        { to: "/dashboard/technician", label: "Job queue", icon: Wrench, end: true },
      ],
    };
  }

  if (role === "parts_seller") {
    return {
      title: "Parts Supplier OS",
      subtitle: "B2B ERP",
      items: [
        { to: "/dashboard/parts", label: "Dashboard", icon: LayoutDashboard, end: true },
        { to: "/dashboard/parts/catalog", label: "Catalog", icon: Package },
        { to: "/dashboard/parts/orders", label: "Orders", icon: ClipboardList },
        { to: "/dashboard/parts/analytics", label: "Analytics", icon: BarChart3 },
      ],
    };
  }

  if (role === "bank_nbfc") {
    return {
      title: "Lender console",
      subtitle: "NBFC / bank",
      items: [
        { to: "/dashboard/finance", label: "Pipeline", icon: LayoutDashboard, end: true },
        { to: "/dashboard/finance/applications", label: "Applications", icon: Landmark },
      ],
    };
  }

  if (role === "finance_manager") {
    return {
      title: "Finance OS",
      subtitle: "Command center",
      items: [
        { to: "/dashboard/finance-manager", label: "Overview", icon: LayoutDashboard, end: true },
        { to: "/dashboard/finance-manager/crm", label: "Loan CRM", icon: Gauge },
        { to: "/dashboard/finance-manager/applications", label: "Applications", icon: Landmark },
        { to: "/dashboard/finance-manager/commissions", label: "Commissions", icon: BarChart3 },
        { to: "/dashboard/finance-manager/integrations", label: "Bank APIs", icon: Plug },
        { to: "/finance/offers", label: "Marketplace", icon: Store },
        { to: "/finance/tools", label: "EMI & eligibility", icon: Search },
      ],
    };
  }

  if (role === "auction_partner") {
    return {
      title: "Auctions",
      subtitle: "Partner desk",
      items: [
        { to: "/dashboard/auction", label: "Moderation", icon: Shield, end: true },
        { to: "/auctions", label: "Live hub", icon: Gavel },
      ],
    };
  }

  return {
    title: "Account",
    subtitle: "Motorcart",
    items: [{ to: "/profile", label: "Profile", icon: UserCog, end: true }],
  };
}
