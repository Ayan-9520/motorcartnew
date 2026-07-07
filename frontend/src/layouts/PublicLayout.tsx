import { Outlet, useLocation } from "react-router-dom";
import { RouteSuspense } from "@/layouts/RouteSuspense";
import { useSyncVehicleHubFromRoute } from "@/hooks/useSyncVehicleHubFromRoute";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { FloatingButtons } from "@/components/layout/FloatingButtons";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { GlobalSearchDialog } from "@/components/search/GlobalSearchDialog";

export function PublicLayout() {
  useSyncVehicleHubFromRoute();
  const { pathname } = useLocation();
  const isCommunity =
    pathname === "/community" || pathname.startsWith("/community/");
  const hideDefaultFooter = isCommunity;

  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-background text-foreground">
      <Navbar />
      <main className="min-w-0 flex-1 pb-20 md:pb-0">
        <RouteSuspense>
          <Outlet />
        </RouteSuspense>
      </main>
      {!hideDefaultFooter && <Footer />}
      <FloatingButtons />
      <GlobalSearchDialog />
      {!isCommunity && <MobileBottomNav />}
    </div>
  );
}
