import { DealerWorkspaceGuard } from "@/components/routing/DealerWorkspaceGuard";
import { RoleSidebar } from "@/dashboards/components/RoleSidebar";
import { DashboardMobileNav } from "@/dashboards/components/DashboardMobileNav";
import { Navbar } from "@/components/layout/Navbar";
import { RouteSuspense } from "@/layouts/RouteSuspense";

export function DealerDashboardLayout() {
  return (
    <div className="workspace-shell flex flex-col">
      <Navbar />
      <div className="dashboard-shell-bar shrink-0 border-b border-border/50 px-4 py-2 lg:hidden">
        <DashboardMobileNav />
      </div>
      <div className="workspace-shell__body">
        <RoleSidebar />
        <main className="dealer-os-layout workspace-shell__main bg-background p-4 md:p-6">
          <RouteSuspense>
            <DealerWorkspaceGuard />
          </RouteSuspense>
        </main>
      </div>
    </div>
  );
}
