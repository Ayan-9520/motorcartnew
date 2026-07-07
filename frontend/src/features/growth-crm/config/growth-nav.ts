import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Building2,
  Image,
  Palette,
  MessageCircle,
  FileText,
  Kanban,
  BarChart3,
  Share2,
  Radio,
} from "lucide-react";

export type GrowthNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
};

export const GROWTH_NAV: GrowthNavItem[] = [
  { to: "/dashboard/growth", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/dashboard/growth/workspaces", label: "Workspaces", icon: Building2 },
  { to: "/dashboard/growth/assets", label: "Assets", icon: Image },
  { to: "/dashboard/growth/designs", label: "Designs", icon: Palette },
  { to: "/dashboard/growth/whatsapp", label: "WhatsApp", icon: MessageCircle },
  {
    to: "/dashboard/growth/whatsapp/architecture",
    label: "WA architecture",
    icon: Radio,
  },
  { to: "/dashboard/growth/social", label: "Social scheduler", icon: Share2 },
  { to: "/dashboard/growth/leads", label: "Lead Forms", icon: FileText },
  { to: "/dashboard/growth/leads/pipeline", label: "Lead Pipeline", icon: Kanban },
  { to: "/dashboard/growth/leads/analytics", label: "Lead Analytics", icon: BarChart3 },
];
