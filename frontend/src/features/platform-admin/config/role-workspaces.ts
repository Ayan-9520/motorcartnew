import type { AppRole } from "@/types/database";
import { DASHBOARD_ROUTES } from "@/lib/constants";
import { ROLE_DISPLAY_NAMES } from "@/auth/ecosystem-roles";

export type RoleWorkspaceRow = {
  role: AppRole;
  label: string;
  dashboardPath: string;
  signupType: "customer" | "business" | "internal";
  needsAdminApproval: boolean;
};

const BUSINESS_ROLES: AppRole[] = [
  "dealer",
  "used_car_dealer",
  "new_car_dealer",
  "bike_dealer",
  "truck_dealer",
  "dsa_agent",
  "parts_seller",
  "service_center",
];

const INTERNAL_ROLES: AppRole[] = [
  "super_admin",
  "admin",
  "finance_manager",
  "bank_nbfc",
  "auction_partner",
  "service_technician",
];

export const PLATFORM_ROLE_WORKSPACES: RoleWorkspaceRow[] = (
  Object.keys(DASHBOARD_ROUTES) as AppRole[]
).map((role) => ({
  role,
  label: ROLE_DISPLAY_NAMES[role] ?? role.replace(/_/g, " "),
  dashboardPath: DASHBOARD_ROUTES[role] ?? "/dashboard/customer",
  signupType: role === "customer"
    ? "customer"
    : BUSINESS_ROLES.includes(role)
      ? "business"
      : "internal",
  needsAdminApproval: BUSINESS_ROLES.includes(role),
}));
