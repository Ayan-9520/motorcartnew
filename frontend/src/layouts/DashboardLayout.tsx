import { Outlet } from "react-router-dom";
import { RoleSidebar } from "@/dashboards/components/RoleSidebar";
import { CustomerSidebar } from "@/dashboards/components/CustomerSidebar";
import { CustomerBottomNav } from "@/dashboards/components/CustomerBottomNav";
import { DashboardMobileNav } from "@/dashboards/components/DashboardMobileNav";
import { CustomerMobileNav } from "@/dashboards/components/CustomerMobileNav";
import { Navbar } from "@/components/layout/Navbar";
import { RouteSuspense } from "@/layouts/RouteSuspense";
import { useAuthStore } from "@/store/authStore";

export function DashboardLayout() {
  const role = useAuthStore((s) => s.user?.role ?? "customer");
  const isCustomer = role === "customer";

  return (
    <div
      className={
        isCustomer
          ? "cos-layout workspace-shell flex flex-col"
          : "workspace-shell flex flex-col"
      }
    >
      <div className="workspace-shell__top shrink-0">
        <Navbar />
        <div className="dashboard-shell-bar border-b border-border/50 px-4 py-2 lg:hidden">
          {isCustomer ? <CustomerMobileNav /> : <DashboardMobileNav />}
        </div>
      </div>
      <div className="workspace-shell__body">
        {isCustomer ? <CustomerSidebar /> : <RoleSidebar />}
        <main
          className={
            isCustomer
              ? "cos-main cos-main--with-bottom-nav workspace-shell__main pb-20 lg:pb-0"
              : "workspace-shell__main bg-background p-4 sm:p-6"
          }
        >
          <RouteSuspense>
            <Outlet />
          </RouteSuspense>
        </main>
      </div>
      {isCustomer ? <CustomerBottomNav /> : null}
    </div>
  );
}
