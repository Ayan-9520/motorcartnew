import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Users,
  Building2,
  ChevronLeft,
  Gauge,
  Plug,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";
import { Button } from "@/components/ui/button";
import { RoleSidebarUserFooter } from "@/dashboards/components/RoleSidebarUserFooter";

const customerLinks = [
  { to: "/dashboard/customer/loans", label: "My loans", icon: FileText },
  { to: "/dashboard/customer/insurance", label: "My insurance", icon: Shield },
  { to: "/insurance", label: "Buy insurance", icon: Shield },
  { to: "/finance", label: "Finance hub", icon: Building2 },
];

const dsaLinks = [
  { to: "/dashboard/dsa", label: "DSA overview", icon: LayoutDashboard },
  { to: "/dashboard/dsa/applications", label: "Applications", icon: FileText },
  { to: "/dashboard/dsa/leads", label: "Lead CRM", icon: Gauge },
  { to: "/dashboard/dsa/integrations", label: "Bank APIs", icon: Plug },
  { to: "/dashboard/dsa/team", label: "Team", icon: Users },
  { to: "/finance/offers", label: "Loan marketplace", icon: Building2 },
];

const lenderLinks = [
  { to: "/dashboard/finance", label: "Lender overview", icon: LayoutDashboard },
  { to: "/dashboard/finance/applications", label: "Applications", icon: FileText },
  { to: "/dashboard/finance/team", label: "Team", icon: Users },
];

interface FinanceSidebarProps {
  variant: "customer" | "dsa" | "lender";
}

export function FinanceSidebar({ variant }: FinanceSidebarProps) {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const links = variant === "dsa" ? dsaLinks : variant === "lender" ? lenderLinks : customerLinks;
  const title = variant === "dsa" ? "DSA Portal" : variant === "lender" ? "Lender Hub" : "My Finance";

  return (
    <aside
      className={cn(
        "sidebar-shell dashboard-sidebar hidden shrink-0 flex-col transition-all duration-300 lg:flex",
        sidebarOpen ? "w-64" : "w-[72px]"
      )}
    >
      <div className="dashboard-sidebar__head flex h-16 shrink-0 items-center justify-between border-b px-4">
        {sidebarOpen && <span className="font-semibold text-sm">{title}</span>}
        <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Toggle sidebar">
          <ChevronLeft className={cn("h-4 w-4 transition-transform", !sidebarOpen && "rotate-180")} />
        </Button>
      </div>
      <nav className="dashboard-sidebar__nav min-h-0 flex-1 space-y-1 p-3">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to.endsWith("/dsa") || to.endsWith("/finance")}
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
      <RoleSidebarUserFooter />
    </aside>
  );
}
