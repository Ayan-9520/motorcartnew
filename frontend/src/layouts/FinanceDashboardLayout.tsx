import { Outlet, useLocation } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { FinanceSidebar } from "@/components/layout/FinanceSidebar";
import { DashboardMobileNav } from "@/dashboards/components/DashboardMobileNav";
import { RouteSuspense } from "@/layouts/RouteSuspense";

function variantFromPath(path: string): "customer" | "dsa" | "lender" {
  if (path.includes("/dashboard/dsa")) return "dsa";
  if (path.includes("/dashboard/finance")) return "lender";
  return "customer";
}

export function FinanceDashboardLayout() {
  const { pathname } = useLocation();
  const variant = variantFromPath(pathname);

  return (
    <div className="workspace-shell flex flex-col">
      <Navbar />
      <div className="dashboard-shell-bar shrink-0 border-b border-border/50 px-4 py-2 lg:hidden">
        <DashboardMobileNav />
      </div>
      <div className="workspace-shell__body">
        <FinanceSidebar variant={variant} />
        <main className="workspace-shell__main bg-background p-4 sm:p-6">
          <RouteSuspense>
            <Outlet />
          </RouteSuspense>
        </main>
      </div>
    </div>
  );
}
