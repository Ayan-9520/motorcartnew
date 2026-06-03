import type { AppRole } from "@/types/database";
import type { User } from "@/types";
import { getRoleDashboardPath } from "@/auth/get-role-dashboard-path";
import {
  isAccountPendingApproval,
  PENDING_APPROVAL_PATH,
} from "@/auth/ecosystem-roles";
import { resolveUserWorkspaceRole, isNewCarDealerWorkspace } from "@/auth/workspace-role";
import { isDealerRole } from "@/permissions/role-matching";

const AUTH_PATHS = new Set([
  "/login",
  "/signup",
  "/signup/customer",
  "/signup/business",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
]);

/** Workspace URL roots each role may use after login. */
function workspaceRoots(workspace: AppRole): string[] {
  switch (workspace) {
    case "super_admin":
      return ["/dashboard/super-admin", "/dashboard/admin", "/dashboard/auction"];
    case "admin":
      return ["/dashboard/super-admin", "/dashboard/admin"];
    case "new_car_dealer":
      return ["/dashboard/new-car"];
    case "customer":
      return ["/dashboard/customer"];
    case "dsa_agent":
      return ["/dashboard/dsa"];
    case "parts_seller":
      return ["/dashboard/parts"];
    case "service_center":
    case "service_partner":
      return ["/dashboard/service", "/dashboard/technician"];
    case "service_technician":
      return ["/dashboard/technician", "/dashboard/service"];
    case "bank_nbfc":
    case "finance_manager":
      return ["/dashboard/finance", "/dashboard/finance-manager"];
    case "auction_partner":
      return ["/dashboard/auction"];
    default:
      if (isDealerRole(workspace)) return ["/dashboard/dealer"];
      return ["/dashboard/customer"];
  }
}

function isPublicPostLoginPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname.startsWith("/dashboard")) return false;
  if (pathname.startsWith("/pending-approval") || pathname === "/profile") return true;
  return (
    pathname.startsWith("/buy") ||
    pathname.startsWith("/sell") ||
    pathname.startsWith("/cars") ||
    pathname.startsWith("/vehicles") ||
    pathname.startsWith("/finance") ||
    pathname.startsWith("/insurance") ||
    pathname.startsWith("/parts") ||
    pathname.startsWith("/services") ||
    pathname.startsWith("/community") ||
    pathname.startsWith("/auctions")
  );
}

/** True when this dashboard URL belongs to the signed-in user's workspace. */
export function isPathInUserWorkspace(
  user: Pick<User, "role" | "dealerType" | "businessCategory" | "accountStatus" | "approvalStatus">,
  pathname: string
): boolean {
  if (isAccountPendingApproval(user)) {
    return pathname === PENDING_APPROVAL_PATH || pathname.startsWith("/profile");
  }

  if (!pathname.startsWith("/dashboard")) {
    return isPublicPostLoginPath(pathname);
  }

  const workspace = resolveUserWorkspaceRole(user);
  const roots = workspaceRoots(workspace);
  return roots.some((root) => pathname === root || pathname.startsWith(`${root}/`));
}

/** Map legacy / dealer URLs to the user's canonical workspace (e.g. new-car dealer off /dashboard/dealer). */
export function normalizePathForWorkspace(
  user: Pick<User, "role" | "dealerType" | "businessCategory">,
  pathname: string
): string {
  if (isNewCarDealerWorkspace(user) && pathname.startsWith("/dashboard/dealer")) {
    return pathname.replace(/^\/dashboard\/dealer/, "/dashboard/new-car") || "/dashboard/new-car";
  }
  return pathname;
}

export function getWorkspaceHomePath(
  user: Pick<User, "role" | "dealerType" | "businessCategory" | "accountStatus" | "approvalStatus">
): string {
  if (isAccountPendingApproval(user)) return PENDING_APPROVAL_PATH;
  return getRoleDashboardPath(user);
}

