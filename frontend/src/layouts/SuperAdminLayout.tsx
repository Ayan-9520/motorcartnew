import { Outlet } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { SuperAdminSidebar } from "@/dashboards/components/SuperAdminSidebar";
import { SuperAdminMobileNav } from "@/dashboards/components/SuperAdminMobileNav";
import { RouteSuspense } from "@/layouts/RouteSuspense";

export function SuperAdminLayout() {
  return (
    <div className="erp-layout sa-layout workspace-shell flex flex-col">
      <Navbar />
      <div className="dashboard-shell-bar shrink-0 border-b border-border/50 px-4 py-2 lg:hidden">
        <SuperAdminMobileNav />
      </div>
      <div className="workspace-shell__body">
        <SuperAdminSidebar />
        <main className="erp-main sa-main workspace-shell__main">
          <RouteSuspense>
            <Outlet />
          </RouteSuspense>
        </main>
      </div>
    </div>
  );
}
