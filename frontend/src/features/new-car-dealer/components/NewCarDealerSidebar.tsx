import { NavLink } from "react-router-dom";
import { Car, ChevronLeft } from "lucide-react";
import { NEW_CAR_DEALER_NAV } from "../config/ncd-nav";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";
import { Button } from "@/components/ui/button";
import { RoleSidebarUserFooter } from "@/dashboards/components/RoleSidebarUserFooter";

export function NewCarDealerSidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <aside
      className={cn(
        "ncd-sidebar dashboard-sidebar hidden shrink-0 flex-col lg:flex",
        sidebarOpen ? "w-[17rem]" : "w-[4.5rem]"
      )}
    >
      <div className="dashboard-sidebar__head">
        <div className="ncd-sidebar__brand shrink-0">
          {sidebarOpen ? (
            <div className="min-w-0">
              <p className="ncd-sidebar__title">New Car OS</p>
              <p className="ncd-sidebar__sub">Showroom command</p>
            </div>
          ) : (
            <span className="ncd-sidebar__logo mx-auto" title="New Car OS">
              <Car className="h-4 w-4" />
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", !sidebarOpen && "rotate-180")} />
          </Button>
        </div>
      </div>

      <nav className="ncd-sidebar__nav dashboard-sidebar__nav min-h-0 flex-1">
        {NEW_CAR_DEALER_NAV.map((group) => (
          <div key={group.label} className="ncd-sidebar__group">
            {sidebarOpen ? <p className="ncd-sidebar__group-label">{group.label}</p> : null}
            {group.items.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={`${group.label}-${to}`}
                to={to}
                end={end}
                title={label}
                className={({ isActive }) => cn("ncd-sidebar__link", isActive && "ncd-sidebar__link--active")}
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
