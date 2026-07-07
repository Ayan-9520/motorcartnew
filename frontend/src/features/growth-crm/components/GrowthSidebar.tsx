import { NavLink } from "react-router-dom";
import { ChevronLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";
import { Button } from "@/components/ui/button";
import { RoleSidebarUserFooter } from "@/dashboards/components/RoleSidebarUserFooter";
import { GROWTH_NAV } from "@/features/growth-crm/config/growth-nav";
import { GrowthWorkspaceSwitcher } from "@/features/growth-crm/components/GrowthWorkspaceSwitcher";

export function GrowthSidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <aside
      className={cn(
        "dashboard-sidebar hidden shrink-0 flex-col border-r bg-card lg:flex",
        sidebarOpen ? "w-64" : "w-[72px]"
      )}
    >
      <div className="dashboard-sidebar__head border-b p-3">
        <div className="flex items-center justify-between gap-2">
          {sidebarOpen && (
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-semibold truncate">
                <Sparkles className="h-4 w-4 text-teal-600 shrink-0" />
                Growth CRM
              </p>
              <p className="text-[11px] text-muted-foreground">Marketing workspace</p>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Toggle sidebar">
            <ChevronLeft className={cn("h-4 w-4", !sidebarOpen && "rotate-180")} />
          </Button>
        </div>
      </div>
      {sidebarOpen ? <GrowthWorkspaceSwitcher /> : null}
      <nav className="dashboard-sidebar__nav flex-1 overflow-y-auto p-2 space-y-0.5">
        {GROWTH_NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
            title={label}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {sidebarOpen && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>
      <RoleSidebarUserFooter />
    </aside>
  );
}
