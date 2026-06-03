import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { getPostLoginDashboardPath } from "@/auth/post-login-path";
import type { AppRole } from "@/types/database";
import { PageSpinner } from "@/shared/ui/loading/PageSpinner";

/** Sends `/dashboard` to the signed-in user's real workspace. */
export function RoleDashboardRedirect() {
  const { user, isLoading, profileHydrated, isAuthenticated } = useAuthStore();

  if (isLoading || (isAuthenticated && !profileHydrated)) {
    return <PageSpinner label="Opening workspace…" className="min-h-[40vh]" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getPostLoginDashboardPath(user.role as AppRole, user)} replace state={undefined} />;
}
