import { Outlet } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { ServicePartnerSidebar } from "@/features/service-partner/components/ServicePartnerSidebar";
import { ServicePartnerMobileNav } from "@/features/service-partner/components/ServicePartnerMobileNav";
import { RouteSuspense } from "@/layouts/RouteSuspense";

export function ServiceHubLayout() {
  return (
    <div className="sh-layout workspace-shell flex flex-col">
      <Navbar />
      <div className="dashboard-shell-bar shrink-0 border-b border-border/50 px-4 py-2 lg:hidden">
        <ServicePartnerMobileNav />
      </div>
      <div className="workspace-shell__body">
        <ServicePartnerSidebar />
        <main className="sh-main workspace-shell__main">
          <RouteSuspense>
            <Outlet />
          </RouteSuspense>
        </main>
      </div>
    </div>
  );
}
