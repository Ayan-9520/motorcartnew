import type { AppRole } from "@/types/database";
import type { User } from "@/types";
import { getPostLoginDashboardPath } from "@/auth/post-login-path";
import { resolveLoginRedirect } from "@/auth/login-redirect";

/** Land on the user's real workspace dashboard (not another role's CRM). */
export function resolvePostLoginPath(
  role: AppRole,
  from?: { pathname?: string; search?: string } | null,
  user?: Pick<User, "role" | "dealerType" | "businessCategory" | "accountStatus" | "approvalStatus"> | null,
  redirectParam?: string | null
): string {
  if (user) {
    return resolveLoginRedirect(user as User, { from, redirectParam });
  }
  return getPostLoginDashboardPath(role, null);
}
