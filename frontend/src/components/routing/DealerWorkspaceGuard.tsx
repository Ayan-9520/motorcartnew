import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { isNewCarDealerWorkspace } from "@/auth/workspace-role";
import { normalizePathForWorkspace } from "@/auth/workspace-redirect";

/**
 * Pre-owned dealers use /dashboard/dealer/*.
 * New-car dealers belong on /dashboard/new-car/* (not mixed dealer layout URLs).
 */
export function DealerWorkspaceGuard() {
  const user = useAuthStore((s) => s.user);
  const { pathname, search } = useLocation();

  if (user && isNewCarDealerWorkspace(user)) {
    const target = normalizePathForWorkspace(user, pathname);
    if (target !== pathname) {
      return <Navigate to={`${target}${search}`} replace />;
    }
  }

  return <Outlet />;
}
