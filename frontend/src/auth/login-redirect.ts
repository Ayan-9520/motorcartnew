import type { User } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { getWorkspaceHomePath, isPathInUserWorkspace, normalizePathForWorkspace } from "@/auth/workspace-redirect";

export type LoginRedirectOptions = {
  from?: { pathname?: string; search?: string } | null;
  /** `?redirect=/path` from login links */
  redirectParam?: string | null;
};

/** Wait until DB profile is hydrated (correct `role`, approval status). */
export async function waitForHydratedUser(maxMs = 8000): Promise<User | null> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const { user, profileHydrated, isAuthenticated } = useAuthStore.getState();
    if (isAuthenticated && profileHydrated && user) return user;
    await new Promise((r) => setTimeout(r, 40));
  }
  return useAuthStore.getState().user;
}

/**
 * After sign-in: always land on the user's real workspace home.
 * Only exceptions: same-workspace dashboard deep link, or validated `?redirect=` param.
 */
export function resolveLoginRedirect(user: User, options?: LoginRedirectOptions): string {
  const home = getWorkspaceHomePath(user);

  const rawRedirect = options?.redirectParam?.trim();
  if (rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")) {
    const pathOnly = rawRedirect.split("?")[0] ?? rawRedirect;
    if (pathOnly.startsWith("/dashboard") && isPathInUserWorkspace(user, pathOnly)) {
      return normalizePathForWorkspace(user, rawRedirect);
    }
    if (!pathOnly.startsWith("/dashboard") && isPathInUserWorkspace(user, pathOnly)) {
      return rawRedirect;
    }
  }

  const pathname = options?.from?.pathname;
  if (pathname?.startsWith("/dashboard") && isPathInUserWorkspace(user, pathname)) {
    return `${normalizePathForWorkspace(user, pathname)}${options?.from?.search ?? ""}`;
  }

  return home;
}
