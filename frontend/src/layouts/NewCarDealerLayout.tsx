import { Outlet } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { NewCarDealerSidebar } from "@/features/new-car-dealer/components/NewCarDealerSidebar";
import { NewCarDealerMobileNav } from "@/features/new-car-dealer/components/NewCarDealerMobileNav";
import { RouteSuspense } from "@/layouts/RouteSuspense";

export function NewCarDealerLayout() {
  return (
    <div className="ncd-layout workspace-shell flex flex-col">
      <Navbar />
      <div className="dashboard-shell-bar shrink-0 border-b border-border/50 px-4 py-2 lg:hidden">
        <NewCarDealerMobileNav />
      </div>
      <div className="workspace-shell__body">
        <NewCarDealerSidebar />
        <main className="ncd-main workspace-shell__main">
          <RouteSuspense>
            <Outlet />
          </RouteSuspense>
        </main>
      </div>
    </div>
  );
}
