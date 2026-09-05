import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Car, Users, MessageSquare, BarChart3,
  Phone, UserCog, Settings, FileQuestion, FileText, Calendar, ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";
import { Button } from "@/components/ui/button";
import { featureFlags } from "@/config/feature-flags";

const links = [
  { to: "/dashboard/dealer", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/dashboard/dealer/inventory", label: "Inventory", icon: Car },
  { to: "/dashboard/dealer/leads", label: "Leads", icon: Users },
  { to: "/dashboard/dealer/pipeline", label: "Pipeline", icon: LayoutDashboard },
  { to: "/dashboard/dealer/follow-ups", label: "Follow-ups", icon: Calendar },
  { to: "/dashboard/dealer/quotations", label: "Quotations", icon: FileText },
  { to: "/dashboard/dealer/test-drives", label: "Test drives", icon: Calendar },
  { to: "/dashboard/dealer/enquiries", label: "Enquiries", icon: FileQuestion },
  { to: "/dashboard/dealer/whatsapp", label: "WhatsApp", icon: MessageSquare },
  { to: "/dashboard/dealer/calls", label: "Calls", icon: Phone },
  ...(featureFlags.leadBoard ? [{ to: "/dashboard/dealer/lead-board", label: "Lead Board", icon: Users }] : []),
  { to: "/dashboard/dealer/credits", label: "Credits", icon: BarChart3 },
  { to: "/dashboard/dealer/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/dashboard/dealer/team", label: "Team", icon: UserCog },
  { to: "/dashboard/dealer/settings", label: "Settings", icon: Settings },
];

export function DealerSidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <aside
      className={cn(
        "sidebar-shell hidden shrink-0 flex-col transition-all duration-300 lg:flex",
        sidebarOpen ? "w-64" : "w-[72px]"
      )}
    >
      <div className="flex h-16 items-center justify-between border-b px-4">
        {sidebarOpen && <span className="font-semibold text-sm">Dealer CRM</span>}
        <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Toggle sidebar">
          <ChevronLeft className={cn("h-4 w-4 transition-transform", !sidebarOpen && "rotate-180")} />
        </Button>
      </div>
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive ? "sidebar-link-active" : "sidebar-link"
              )
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            {sidebarOpen && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
