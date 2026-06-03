import { NavLink } from "react-router-dom";
import { ChevronLeft, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";
import { Button } from "@/components/ui/button";
import { RoleSidebarUserFooter } from "@/dashboards/components/RoleSidebarUserFooter";
import { PARTS_SUPPLIER_NAV } from "../config/ps-nav";

export function PartsSupplierSidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <aside
      className={cn(
        "psp-sidebar dashboard-sidebar hidden shrink-0 flex-col lg:flex",
        sidebarOpen ? "w-64" : "w-[72px]"
      )}
    >
      <div className="dashboard-sidebar__head">
        <div className="psp-sidebar__brand shrink-0">
          {sidebarOpen && (
            <div>
              <p className="psp-sidebar__title">Parts Supplier OS</p>
              <p className="psp-sidebar__sub">B2B · Boodmo-style ERP</p>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Toggle sidebar">
            <ChevronLeft className={cn("h-4 w-4 transition-transform", !sidebarOpen && "rotate-180")} />
          </Button>
        </div>
        <div className="psp-sidebar__logo-row shrink-0">
          <span className="psp-sidebar__logo">
            <Package className="h-4 w-4" />
          </span>
          {sidebarOpen && <span className="text-xs text-green-500/70">B2B · IndiaMART-grade</span>}
        </div>
      </div>
      <nav className="psp-sidebar__nav dashboard-sidebar__nav min-h-0 flex-1">
        {PARTS_SUPPLIER_NAV.map((group) => (
          <div key={group.label} className="psp-sidebar__group">
            {sidebarOpen && <p className="psp-sidebar__group-label">{group.label}</p>}
            {group.items.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn("psp-sidebar__link", isActive && "psp-sidebar__link--active")
                }
                title={label}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {sidebarOpen && <span>{label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <RoleSidebarUserFooter />
    </aside>
  );
}
