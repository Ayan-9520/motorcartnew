import type { AppRole } from "@/types/database";
import type { User } from "@/types";
import { getRoleDashboardPath } from "@/auth/get-role-dashboard-path";
import { getWorkspaceHomePath } from "@/auth/workspace-redirect";

/** Default landing route after successful email / OAuth / OTP sign-in. */
export function getPostLoginDashboardPath(
  role: AppRole,
  user?: Pick<User, "role" | "dealerType" | "businessCategory" | "accountStatus" | "approvalStatus"> | null
): string {
  if (user) return getWorkspaceHomePath(user);
  return getRoleDashboardPath(role);
}
