import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Bot,
  Calendar,
  Car,
  ClipboardList,
  CreditCard,
  FileText,
  Gauge,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Package,
  Percent,
  Settings,
  Shield,
  Sparkles,
  Truck,
  UserCog,
  Users,
  Wrench,
  Zap,
  ClipboardCheck,
  GitBranch,
  Building2,
  Radio,
  Heart,
  Star,
} from "lucide-react";

export type ShNavItem = { to: string; label: string; icon: LucideIcon; end?: boolean };
export type ShNavGroup = { label: string; items: ShNavItem[] };

export const SERVICE_PARTNER_NAV: ShNavGroup[] = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard/service", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/dashboard/service/ai", label: "AI insights", icon: Bot },
      { to: "/dashboard/service/operations/live", label: "Live operations", icon: Radio },
      { to: "/dashboard/service/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Bookings",
    items: [
      { to: "/dashboard/service/bookings/new", label: "New bookings", icon: Zap },
      { to: "/dashboard/service/bookings/upcoming", label: "Upcoming", icon: Calendar },
      { to: "/dashboard/service/bookings/in-progress", label: "In progress", icon: Wrench },
      { to: "/dashboard/service/bookings/pickup", label: "Pickup requests", icon: Truck },
      { to: "/dashboard/service/bookings/emergency", label: "Emergency", icon: AlertTriangle },
      { to: "/dashboard/service/bookings/completed", label: "Completed", icon: ClipboardCheck },
      { to: "/dashboard/service/bookings/cancelled", label: "Cancelled", icon: FileText },
      { to: "/dashboard/service/bookings", label: "All bookings", icon: ClipboardList },
    ],
  },
  {
    label: "Workshop",
    items: [
      { to: "/dashboard/service/workshop/job-cards", label: "Job cards", icon: ClipboardList },
      { to: "/dashboard/service/workshop/inspection", label: "Inspection center", icon: Car },
      { to: "/dashboard/service/workshop/bays", label: "Bay management", icon: Building2 },
      { to: "/dashboard/service/workshop/technicians", label: "Technicians", icon: UserCog },
      { to: "/dashboard/service/calendar", label: "Calendar", icon: Calendar },
      { to: "/dashboard/service/workshop/kanban", label: "Workflow board", icon: GitBranch },
    ],
  },
  {
    label: "Customers",
    items: [
      { to: "/dashboard/service/customers", label: "Customer CRM", icon: Users },
      { to: "/dashboard/service/customers/vehicles", label: "Vehicle history", icon: Car },
      { to: "/dashboard/service/customers/repeat", label: "Repeat customers", icon: Heart },
      { to: "/dashboard/service/customers/loyalty", label: "Loyalty members", icon: Star },
      { to: "/dashboard/service/customers/reviews", label: "Feedback & reviews", icon: MessageSquare },
    ],
  },
  {
    label: "Services",
    items: [
      { to: "/dashboard/service/services/periodic", label: "Periodic service", icon: Wrench },
      { to: "/dashboard/service/services/ac", label: "AC service", icon: Gauge },
      { to: "/dashboard/service/services/body", label: "Denting & painting", icon: Car },
      { to: "/dashboard/service/services/detailing", label: "Detailing", icon: Sparkles },
      { to: "/dashboard/service/services/ceramic", label: "Ceramic coating", icon: Sparkles },
      { to: "/dashboard/service/services/battery", label: "Battery", icon: Zap },
      { to: "/dashboard/service/services/tyre", label: "Tyre service", icon: Car },
      { to: "/dashboard/service/services/ev", label: "EV diagnostics", icon: Bot },
    ],
  },
  {
    label: "Spare parts",
    items: [
      { to: "/dashboard/service/parts/inventory", label: "Inventory", icon: Package },
      { to: "/dashboard/service/parts/low-stock", label: "Low stock", icon: AlertTriangle },
      { to: "/dashboard/service/parts/vendors", label: "Vendors", icon: Building2 },
      { to: "/dashboard/service/parts/po", label: "Purchase orders", icon: FileText },
      { to: "/dashboard/service/parts/billing", label: "Parts billing", icon: CreditCard },
      { to: "/dashboard/parts", label: "Sell on parts store", icon: Truck },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/dashboard/service/operations/pickup", label: "Pickup & drop", icon: Truck },
      { to: "/dashboard/service/operations/drivers", label: "Drivers", icon: UserCog },
      { to: "/dashboard/service/operations/routes", label: "Route tracking", icon: MapPin },
      { to: "/dashboard/service/operations/live", label: "Live tracking", icon: Radio },
      { to: "/dashboard/service/operations/rsa", label: "RSA support", icon: Shield },
    ],
  },
  {
    label: "Finance",
    items: [
      { to: "/dashboard/service/finance/revenue", label: "Revenue", icon: BarChart3 },
      { to: "/dashboard/service/finance/invoices", label: "GST invoices", icon: FileText },
      { to: "/dashboard/service/finance/claims", label: "Insurance claims", icon: Shield },
      { to: "/dashboard/service/finance/payments", label: "Payments", icon: CreditCard },
      { to: "/dashboard/service/finance/expenses", label: "Expenses", icon: FileText },
      { to: "/dashboard/service/finance/profit", label: "Profit analytics", icon: Percent },
    ],
  },
  {
    label: "Marketing",
    items: [
      { to: "/dashboard/service/marketing/whatsapp", label: "WhatsApp", icon: MessageSquare },
      { to: "/dashboard/service/marketing/sms", label: "SMS reminders", icon: Bell },
      { to: "/dashboard/service/marketing/reminders", label: "Service reminders", icon: Calendar },
      { to: "/dashboard/service/marketing/offers", label: "Offers & coupons", icon: Percent },
    ],
  },
  {
    label: "Analytics",
    items: [
      { to: "/dashboard/service/analytics", label: "Analytics hub", icon: BarChart3, end: true },
      { to: "/dashboard/service/analytics/revenue", label: "Revenue", icon: BarChart3 },
      { to: "/dashboard/service/analytics/technicians", label: "Technicians", icon: UserCog },
      { to: "/dashboard/service/analytics/workshop", label: "Workshop", icon: Wrench },
      { to: "/dashboard/service/analytics/retention", label: "Retention", icon: Heart },
      { to: "/dashboard/service/analytics/branches", label: "Branches", icon: Building2 },
    ],
  },
  {
    label: "Settings",
    items: [
      { to: "/dashboard/service/profile", label: "Workshop profile", icon: Building2 },
      { to: "/dashboard/service/kyc", label: "KYC", icon: Shield },
      { to: "/dashboard/service/settings/gst", label: "GST details", icon: FileText },
      { to: "/dashboard/service/settings/team", label: "Team & roles", icon: Users },
      { to: "/dashboard/service/settings/hours", label: "Working hours", icon: Calendar },
      { to: "/dashboard/service/settings", label: "Integrations", icon: Settings },
    ],
  },
];
