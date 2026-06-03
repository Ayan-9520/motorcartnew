import { Link, NavLink } from "react-router-dom";
import { LayoutGrid } from "lucide-react";
import { RoleSidebarUserFooter } from "@/dashboards/components/RoleSidebarUserFooter";
import { ADMIN_ERP_NAV } from "@/features/platform-admin/config/admin-erp-nav";
import { cn } from "@/lib/utils";

export function SuperAdminSidebar() {
  return (
    <aside className="sa-sidebar erp-sidebar dashboard-sidebar w-[17rem] shrink-0 flex-col">
      <div className="sa-sidebar__brand erp-sidebar__brand shrink-0">
        <div className="erp-sidebar__logo">
          <LayoutGrid className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="sa-sidebar__title">Motorcart</p>
          <p className="sa-sidebar__sub">Super Admin ERP</p>
        </div>
      </div>

      <Link
        to="/"
        className="mx-2 mb-2 flex shrink-0 items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-2.5 py-2 text-xs font-medium text-primary hover:bg-primary/10"
      >
        ← Marketplace home
      </Link>

      <nav className="sa-sidebar__nav erp-sidebar__nav dashboard-sidebar__nav min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {ADMIN_ERP_NAV.map((group) => (
          <div key={group.label ?? "root"} className="erp-sidebar__group">
            {group.label ? <p className="erp-sidebar__group-label">{group.label}</p> : null}
            {group.items.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                title={label}
                className={({ isActive }) =>
                  cn(
                    "sa-sidebar__link erp-sidebar__link",
                    isActive && "sa-sidebar__link--active erp-sidebar__link--active"
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <RoleSidebarUserFooter />
    </aside>
  );
}
