import { useAuthBootstrap } from "@/auth/useAuthBootstrap";
import { useMarketScopeSync } from "@/hooks/useMarketScopeSync";
import { useAuthStore } from "@/store/authStore";
import { AuthBootLoader } from "@/components/auth/AuthBootLoader";

/**
 * Mounts JWT auth listener + profile hydration once for the whole app.
 * Shows a premium boot screen until the first session sync completes.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  useAuthBootstrap();
  useMarketScopeSync();
  const isLoading = useAuthStore((s) => s.isLoading);
  if (isLoading) {
    return <AuthBootLoader />;
  }
  return <>{children}</>;
}
