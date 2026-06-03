import type { AppRole } from "@/types/database";
import type { User } from "@/types";
import { isDealerRole } from "@/permissions/role-matching";

/** Product-facing role labels (maps spec names → stored `app_role`). */
export const ROLE_DISPLAY_NAMES: Partial<Record<AppRole, string>> = {
  customer: "Customer",
  dealer: "Dealer",
  used_car_dealer: "Pre-owned dealer",
  new_car_dealer: "New car dealer",
  bike_dealer: "Bike dealer",
  truck_dealer: "Truck dealer",
  dsa_agent: "DSA agent",
  super_admin: "Super admin",
  parts_seller: "Parts seller",
  service_center: "Service partner",
  admin: "Admin",
};

/** Roles that register via business signup and require admin approval. */
export const BUSINESS_SIGNUP_ROLES: AppRole[] = [
  "dealer",
  "used_car_dealer",
  "new_car_dealer",
  "bike_dealer",
  "truck_dealer",
  "dsa_agent",
  "parts_seller",
  "service_center",
];

export function isBusinessSignupRole(role: AppRole): boolean {
  return BUSINESS_SIGNUP_ROLES.includes(role);
}

export function roleRequiresAdminApproval(role: AppRole): boolean {
  return isBusinessSignupRole(role);
}

/** True when business user must not access CRM / dashboards yet. */
export function isAccountPendingApproval(
  user: Pick<User, "accountStatus" | "role" | "approvalStatus">
): boolean {
  if (!roleRequiresAdminApproval(user.role)) return false;
  if (user.approvalStatus === "approved" && user.accountStatus === "active") return false;
  if (user.approvalStatus === "rejected") return true;
  return user.accountStatus !== "active" || user.approvalStatus !== "approved";
}

export const PENDING_APPROVAL_PATH = "/pending-approval";

/** Paths business users may visit while awaiting approval (no dashboard CRM). */
export const PENDING_APPROVAL_ALLOWED_PREFIXES = [
  PENDING_APPROVAL_PATH,
  "/profile",
] as const;

export function isPendingApprovalAllowedPath(pathname: string): boolean {
  return PENDING_APPROVAL_ALLOWED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

/** Canonical dashboard slug aliases (URL-friendly, no enum change). */
export const DASHBOARD_ROLE_ALIASES: Record<string, AppRole | "dealer_workspace"> = {
  "preowned-dealer": "used_car_dealer",
  "newcar-dealer": "new_car_dealer",
  service: "service_center",
  parts: "parts_seller",
  dsa: "dsa_agent",
};

export function resolveDashboardAlias(slug: string): AppRole | "dealer_workspace" | null {
  return DASHBOARD_ROLE_ALIASES[slug] ?? null;
}

export function getDealerWorkspaceRoles(): AppRole[] {
  return [...BUSINESS_SIGNUP_ROLES.filter(isDealerRole), "bike_dealer", "truck_dealer"];
}
