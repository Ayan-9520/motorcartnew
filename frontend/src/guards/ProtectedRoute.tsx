import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import type { UserRole } from "@/lib/constants";
import type { AppRole } from "@/types/database";
import { userCanAccessRoles } from "@/auth/workspace-role";
import {
  isAccountPendingApproval,
  isPendingApprovalAllowedPath,
  PENDING_APPROVAL_PATH,
} from "@/auth/ecosystem-roles";
import { getWorkspaceHomePath, isPathInUserWorkspace } from "@/auth/workspace-redirect";
import { PageSpinner } from "@/shared/ui/loading/PageSpinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, profileHydrated, user } = useAuthStore();
  const location = useLocation();
  const [profileWaitExpired, setProfileWaitExpired] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || profileHydrated) {
      setProfileWaitExpired(false);
      return;
    }
    const t = window.setTimeout(() => setProfileWaitExpired(true), 10_000);
    return () => window.clearTimeout(t);
  }, [isAuthenticated, profileHydrated]);

  const securing = isLoading || (isAuthenticated && !profileHydrated && !profileWaitExpired);

  if (securing) {
    return <PageSpinner label="Securing your session…" className="min-h-[50vh]" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.accountStatus === "suspended" || user?.accountStatus === "closed") {
    return <Navigate to="/account-suspended" replace />;
  }

  if (roles && user && !userCanAccessRoles(user, roles as AppRole[])) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (
    user &&
    isAccountPendingApproval(user) &&
    !isPendingApprovalAllowedPath(location.pathname)
  ) {
    return <Navigate to={PENDING_APPROVAL_PATH} replace />;
  }

  if (
    user &&
    location.pathname.startsWith("/dashboard") &&
    !isPathInUserWorkspace(user, location.pathname)
  ) {
    return <Navigate to={getWorkspaceHomePath(user)} replace />;
  }

  return <>{children}</>;
}
