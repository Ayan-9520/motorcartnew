import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { PageSpinner } from "@/shared/ui/loading/PageSpinner";

type MarketingHomeGateProps = {
  children: React.ReactNode;
};

/**
 * Marketing homepage — available to guests and logged-in users.
 * Role workspace stays on Navbar → Workspace (not auto-redirect from `/`).
 */
export function MarketingHomeGate({ children }: MarketingHomeGateProps) {
  const { isLoading, profileHydrated, isAuthenticated } = useAuthStore();
  const [profileWaitExpired, setProfileWaitExpired] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || profileHydrated) {
      setProfileWaitExpired(false);
      return;
    }
    const t = window.setTimeout(() => setProfileWaitExpired(true), 5000);
    return () => window.clearTimeout(t);
  }, [isAuthenticated, profileHydrated]);

  const securing = isLoading || (isAuthenticated && !profileHydrated && !profileWaitExpired);

  if (securing) {
    return <PageSpinner label="Loading…" className="min-h-[50vh]" />;
  }

  return <>{children}</>;
}
