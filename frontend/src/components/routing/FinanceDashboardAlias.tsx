import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { resolveUserWorkspaceRole } from "@/auth/workspace-role";

/** Legacy alias: /finance/dashboard → correct finance workspace by role. */
export function FinanceDashboardAlias() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;

  const role = resolveUserWorkspaceRole(user);
  if (role === "bank_nbfc") return <Navigate to="/dashboard/finance" replace />;
  if (role === "finance_manager") return <Navigate to="/dashboard/finance-manager" replace />;
  if (role === "dsa_agent") return <Navigate to="/dashboard/dsa" replace />;
  if (role === "admin" || role === "super_admin") return <Navigate to="/dashboard/finance-manager" replace />;

  return <Navigate to="/unauthorized" replace />;
}
