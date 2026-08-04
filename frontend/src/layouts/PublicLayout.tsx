import { Outlet, useLocation } from "react-router-dom";
import { RouteSuspense } from "@/layouts/RouteSuspense";
import { useSyncVehicleHubFromRoute } from "@/hooks/useSyncVehicleHubFromRoute";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { FloatingButtons } from "@/components/layout/FloatingButtons";
import { GlobalSearchDialog } from "@/components/search/GlobalSearchDialog";
import { cn } from "@/lib/utils";

export function PublicLayout() {
  useSyncVehicleHubFromRoute();
  const { pathname } = useLocation();
  const isCommunity =
    pathname === "/community" || pathname.startsWith("/community/");

  return (
    <div className="site-layout flex min-h-screen min-w-0 flex-col bg-background text-foreground">
      <Navbar />
      <main className={cn("site-main", isCommunity && "site-main--community")}>
        <RouteSuspense>
          <Outlet key={pathname} />
        </RouteSuspense>
      </main>
      {!isCommunity && <Footer />}
      {!isCommunity && <FloatingButtons />}
      <GlobalSearchDialog />
    </div>
  );
}
