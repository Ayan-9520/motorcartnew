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

  if (isLoading || (isAuthenticated && !profileHydrated)) {
    return <PageSpinner label="Loading…" className="min-h-[50vh]" />;
  }

  return <>{children}</>;
}
