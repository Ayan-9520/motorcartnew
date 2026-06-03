import { NavLink } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { CUSTOMER_ECOSYSTEM_NAV } from "@/features/customer-ecosystem";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";
import { Button } from "@/components/ui/button";
import { RoleSidebarUserFooter } from "@/dashboards/components/RoleSidebarUserFooter";

/** Premium grouped sidebar for customer ownership super app */
export function CustomerSidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <aside
      className={cn(
        "cos-sidebar dashboard-sidebar hidden shrink-0 flex-col border-r border-border/60 transition-all duration-300 lg:flex",
        sidebarOpen ? "w-64" : "w-[72px]"
      )}
    >
      <div className="dashboard-sidebar__head flex h-16 shrink-0 items-center justify-between border-b border-border/60 px-3">
        {sidebarOpen && (
          <div className="min-w-0 pl-1">
            <p className="truncate text-sm font-semibold tracking-tight">Motorcart</p>
            <p className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Ownership OS
            </p>
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Toggle sidebar">
          <ChevronLeft className={cn("h-4 w-4 transition-transform", !sidebarOpen && "rotate-180")} />
        </Button>
      </div>
      <nav className="dashboard-sidebar__nav min-h-0 flex-1 p-2">
        {CUSTOMER_ECOSYSTEM_NAV.map((group) => (
          <div key={group.label} className="cos-sidebar__group">
            {sidebarOpen ? <p className="cos-sidebar__group-label">{group.label}</p> : null}
            {group.items.map(({ to, label, icon: Icon, end, hash }) => (
              <NavLink
                key={`${group.label}-${to}-${label}-${hash ?? ""}`}
                to={hash ? { pathname: to, hash: `#${hash}` } : to}
                end={end && !hash}
                title={!sidebarOpen ? label : undefined}
                className={({ isActive }) =>
                  cn("cos-sidebar__link", isActive && "cos-sidebar__link--active")
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {sidebarOpen ? <span className="truncate">{label}</span> : null}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <RoleSidebarUserFooter />
    </aside>
  );
}
