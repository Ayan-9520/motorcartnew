import type { AppRole } from "@/types/database";
import type { User } from "@/types";
import { isDealerRole, userHasAnyRole } from "@/permissions/role-matching";

export type WorkspaceRoleContext = {
  role: AppRole;
  dealerType?: AppRole | null;
  businessCategory?: string | null;
};

/** Maps stored role + dealer profile to the workspace the user should use. */
export function resolveEffectiveAppRole(ctx: WorkspaceRoleContext): AppRole {
  const { role, dealerType, businessCategory } = ctx;

  if (role === "new_car_dealer") return "new_car_dealer";
  if (role === "preowned_dealer") return "used_car_dealer";
  if (role === "service_partner") return "service_center";

  if (dealerType === "new_car_dealer") return "new_car_dealer";

  if (role === "dealer" && businessCategory === "new_car_showroom") {
    return "new_car_dealer";
  }

  return role;
}

export function resolveUserWorkspaceRole(user: Pick<User, "role" | "dealerType" | "businessCategory">): AppRole {
  return resolveEffectiveAppRole({
    role: user.role as AppRole,
    dealerType: user.dealerType,
    businessCategory: user.businessCategory,
  });
}

export function userCanAccessRoles(
  user: Pick<User, "role" | "dealerType" | "businessCategory">,
  allowed: AppRole[]
): boolean {
  return userHasAnyRole(resolveUserWorkspaceRole(user), allowed);
}

export function isNewCarDealerWorkspace(user: Pick<User, "role" | "dealerType" | "businessCategory">): boolean {
  return resolveUserWorkspaceRole(user) === "new_car_dealer";
}

export function shouldUseNewCarDealerRoutes(user: Pick<User, "role" | "dealerType" | "businessCategory">): boolean {
  return isNewCarDealerWorkspace(user);
}

/** Dealer OS paths that new-car dealers may use (shared finance / comms tools). */
export const NEW_CAR_DEALER_SHARED_DEALER_PATHS = [
  "/dashboard/dealer/finance",
  "/dashboard/dealer/whatsapp",
  "/dashboard/dealer/analytics",
  "/dashboard/dealer/storefront",
  "/dashboard/dealer/team",
  "/dashboard/dealer/settings",
  "/dashboard/dealer/verification",
] as const;

export function isNewCarSharedDealerPath(pathname: string): boolean {
  return NEW_CAR_DEALER_SHARED_DEALER_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}
