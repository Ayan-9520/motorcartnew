import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { GrowthSidebar } from "@/features/growth-crm/components/GrowthSidebar";
import { RouteSuspense } from "@/layouts/RouteSuspense";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/uiStore";
import { GROWTH_NAV } from "@/features/growth-crm/config/growth-nav";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

export function GrowthDashboardLayout() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  return (
    <div className="workspace-shell flex min-h-screen flex-col">
      <Navbar />
      <div className="flex items-center gap-2 border-b px-3 py-2 lg:hidden overflow-x-auto">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="shrink-0">
          <Menu className="h-5 w-5" />
        </Button>
        {GROWTH_NAV.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
                isActive ? "bg-primary text-primary-foreground" : "bg-muted"
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </div>
      <div className="workspace-shell__body flex flex-1 min-h-0">
        <GrowthSidebar />
        <main className="workspace-shell__main flex-1 overflow-auto bg-background p-4 sm:p-6">
          <RouteSuspense>
            <Outlet />
          </RouteSuspense>
        </main>
      </div>
    </div>
  );
}
