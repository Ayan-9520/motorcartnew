import { Outlet } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { PartsSupplierSidebar } from "@/features/parts-supplier/components/PartsSupplierSidebar";
import { PartsSupplierMobileNav } from "@/features/parts-supplier/components/PartsSupplierMobileNav";
import { RouteSuspense } from "@/layouts/RouteSuspense";

export function PartsSupplierLayout() {
  return (
    <div className="psp-layout workspace-shell flex flex-col">
      <Navbar />
      <div className="dashboard-shell-bar shrink-0 border-b border-border/50 px-4 py-2 lg:hidden">
        <PartsSupplierMobileNav />
      </div>
      <div className="workspace-shell__body">
        <PartsSupplierSidebar />
        <main className="psp-main workspace-shell__main">
          <RouteSuspense>
            <Outlet />
          </RouteSuspense>
        </main>
      </div>
    </div>
  );
}
