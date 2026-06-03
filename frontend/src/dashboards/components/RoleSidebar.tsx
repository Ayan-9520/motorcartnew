import { NavLink } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import type { AppRole } from "@/types/database";
import { getRoleNavContext } from "@/dashboards/config/role-navigation";
import { resolveUserWorkspaceRole } from "@/auth/workspace-role";
import { RoleSidebarUserFooter } from "@/dashboards/components/RoleSidebarUserFooter";

/**
 * Role-aware primary navigation for shared dashboard shells (customer / admin / dealer desk).
 */
export function RoleSidebar() {
  const user = useAuthStore((s) => s.user);
  const role = (user ? resolveUserWorkspaceRole(user) : "customer") as AppRole;
  const { title, subtitle, items } = getRoleNavContext(role);
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <aside
      className={cn(
        "sidebar-shell dashboard-sidebar hidden shrink-0 flex-col border-r border-border/60 bg-card/30 transition-all duration-300 lg:flex",
        sidebarOpen ? "w-64" : "w-[72px]"
      )}
    >
      <div className="dashboard-sidebar__head flex h-16 shrink-0 items-center justify-between border-b border-border/60 px-3">
        {sidebarOpen && (
          <div className="min-w-0 pl-1">
            <p className="truncate text-sm font-semibold tracking-tight">{title}</p>
            {subtitle && (
              <p className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Toggle sidebar">
          <ChevronLeft className={cn("h-4 w-4 transition-transform", !sidebarOpen && "rotate-180")} />
        </Button>
      </div>
      <nav className="dashboard-sidebar__nav min-h-0 flex-1 space-y-0.5 p-2">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors",
                isActive ? "sidebar-link-active" : "sidebar-link"
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0 opacity-90" />
            {sidebarOpen && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>
      <RoleSidebarUserFooter />
    </aside>
  );
}
