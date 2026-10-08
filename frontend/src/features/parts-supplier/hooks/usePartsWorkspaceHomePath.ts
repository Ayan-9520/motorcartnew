import { useAuthStore } from "@/store/authStore";
import { getRoleDashboardPath } from "@/auth/get-role-dashboard-path";

/** Home dashboard for dealers / service partners / admins who use Parts as an add-on; null for pure parts sellers. */
export function usePartsWorkspaceHomePath(): string | null {
  const user = useAuthStore((s) => s.user);
  if (!user || user.role === "parts_seller") return null;
  const home = getRoleDashboardPath(user);
  return home.startsWith("/dashboard/parts") ? null : home;
}
