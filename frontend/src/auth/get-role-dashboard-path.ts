import { DASHBOARD_ROUTES } from "@/lib/constants";
import type { AppRole } from "@/types/database";
import { isDealerRole } from "@/permissions/role-matching";
import { resolveEffectiveAppRole, resolveUserWorkspaceRole } from "@/auth/workspace-role";
import type { User } from "@/types";

type WorkspaceUser = Pick<User, "role" | "dealerType" | "businessCategory">;

/** Canonical workspace URL for each role (CRM / command center). */
export function getRoleDashboardPath(roleOrUser: AppRole | WorkspaceUser): string {
  const role =
    typeof roleOrUser === "string"
      ? resolveEffectiveAppRole({ role: roleOrUser })
      : resolveUserWorkspaceRole(roleOrUser);

  if (role === "new_car_dealer") return "/dashboard/new-car";
  if (isDealerRole(role)) return "/dashboard/dealer";
  return DASHBOARD_ROUTES[role] ?? "/dashboard/customer";
}

/** Roles that use a dedicated layout shell (not generic DashboardLayout). */
export function usesDedicatedWorkspace(role: AppRole): boolean {
  return (
    role === "new_car_dealer" ||
    isDealerRole(role) ||
    role === "super_admin" ||
    role === "finance_manager" ||
    role === "service_center" ||
    role === "service_technician" ||
    role === "parts_seller" ||
    role === "dsa_agent" ||
    role === "bank_nbfc" ||
    role === "auction_partner" ||
    role === "broker"
  );
}
