import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  BarChart3,
  Bot,
  Calendar,
  Car,
  ClipboardList,
  FileText,
  Landmark,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Package,
  Shield,
  Store,
  Truck,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";

export type NcdNavItem = { to: string; label: string; icon: LucideIcon; end?: boolean };
export type NcdNavGroup = { label: string; items: NcdNavItem[] };

export const NEW_CAR_DEALER_NAV: NcdNavGroup[] = [
  {
    label: "Command",
    items: [
      { to: "/dashboard/new-car", label: "Showroom home", icon: LayoutDashboard, end: true },
      { to: "/dashboard/new-car/ai", label: "AI assistant", icon: Bot },
      { to: "/dashboard/new-car/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Sales",
    items: [
      { to: "/dashboard/new-car/inventory", label: "New car stock", icon: Car },
      { to: "/dashboard/new-car/inventory/bulk", label: "Bulk upload", icon: Package },
      { to: "/dashboard/new-car/leads", label: "Lead CRM", icon: Users },
      { to: "/dashboard/new-car/quotations", label: "Quotations", icon: FileText },
      { to: "/dashboard/new-car/test-drives", label: "Test drives", icon: Calendar },
      { to: "/dashboard/new-car/bookings", label: "Bookings", icon: ClipboardList },
      { to: "/dashboard/new-car/exchange", label: "Exchange cars", icon: ArrowLeftRight },
    ],
  },
  {
    label: "Fintech",
    items: [
      { to: "/dashboard/new-car/finance", label: "Finance desk", icon: Landmark },
      { to: "/dashboard/new-car/insurance", label: "Insurance hub", icon: Shield },
    ],
  },
  {
    label: "Delivery",
    items: [
      { to: "/dashboard/new-car/deliveries", label: "Deliveries", icon: Truck },
      { to: "/dashboard/new-car/rto", label: "RTO & documents", icon: FileText },
      { to: "/dashboard/new-car/accessories", label: "Accessories", icon: Package },
    ],
  },
  {
    label: "Growth",
    items: [
      { to: "/dashboard/new-car/customers", label: "Customer 360", icon: UserCog },
      { to: "/dashboard/new-car/whatsapp", label: "WhatsApp CRM", icon: MessageSquare },
      { to: "/dashboard/new-car/marketing", label: "Marketing", icon: Megaphone },
      { to: "/dashboard/new-car/storefront", label: "Showroom website", icon: Store },
    ],
  },
  {
    label: "Team",
    items: [
      { to: "/dashboard/new-car/team", label: "Team & targets", icon: UserCog },
      { to: "/dashboard/new-car/settings", label: "Settings", icon: Wrench },
    ],
  },
];
