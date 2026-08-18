/** Permission keys — checked via helpers, not scattered role string compares. */

import type { OrganizationMemberRole } from "./organization.types";

export const ORGANIZATION_PERMISSIONS = [
  "organization.read",
  "organization.update",
  "branch.manage",
  "team.manage",
  "inventory.read",
  "inventory.create",
  "inventory.update",
  "inventory.delete",
  "lead.read",
  "lead.create",
  "lead.assign",
  "lead.update",
  "lead.close",
  "customer.read",
  "customer.update",
  "quotation.create",
  "quotation.read",
  "booking.create",
  "booking.read",
  "finance.lead.read",
  "insurance.lead.read",
  "analytics.read",
  "billing.read",
  "subscription.manage",
] as const;

export type OrganizationPermission = (typeof ORGANIZATION_PERMISSIONS)[number];

const ALL: OrganizationPermission[] = [...ORGANIZATION_PERMISSIONS];

const READ_OPS: OrganizationPermission[] = [
  "organization.read",
  "inventory.read",
  "lead.read",
  "customer.read",
  "quotation.read",
  "booking.read",
  "analytics.read",
];

const ROLE_PERMISSIONS: Record<OrganizationMemberRole, readonly OrganizationPermission[]> = {
  OWNER: ALL,
  ADMIN: ALL,
  MANAGER: [
    "organization.read",
    "organization.update",
    "branch.manage",
    "team.manage",
    "inventory.read",
    "inventory.create",
    "inventory.update",
    "lead.read",
    "lead.create",
    "lead.assign",
    "lead.update",
    "lead.close",
    "customer.read",
    "customer.update",
    "quotation.create",
    "quotation.read",
    "booking.create",
    "booking.read",
    "finance.lead.read",
    "insurance.lead.read",
    "analytics.read",
    "billing.read",
  ],
  SALES: [
    "organization.read",
    "inventory.read",
    "lead.read",
    "lead.create",
    "lead.update",
    "customer.read",
    "quotation.create",
    "quotation.read",
    "booking.create",
    "booking.read",
  ],
  FINANCE: ["organization.read", "lead.read", "finance.lead.read", "customer.read", "billing.read", "analytics.read"],
  INSURANCE: ["organization.read", "lead.read", "insurance.lead.read", "customer.read"],
  SERVICE: ["organization.read", "booking.create", "booking.read", "customer.read", "inventory.read"],
  PARTS: ["organization.read", "inventory.read", "inventory.create", "inventory.update", "lead.read"],
  OPERATIONS: [
    "organization.read",
    "inventory.read",
    "inventory.update",
    "booking.read",
    "lead.read",
    "analytics.read",
  ],
  CALL_AGENT: ["organization.read", "lead.read", "lead.update", "customer.read", "booking.read"],
  MARKETING: ["organization.read", "analytics.read", "customer.read"],
  VIEWER: READ_OPS,
};

export function permissionsForRole(role: OrganizationMemberRole): OrganizationPermission[] {
  return [...ROLE_PERMISSIONS[role]];
}

export function hasOrganizationPermission(
  role: OrganizationMemberRole,
  permission: OrganizationPermission,
  extra: string[] = [],
): boolean {
  if (extra.includes(permission)) return true;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function isOrganizationPermission(value: string): value is OrganizationPermission {
  return (ORGANIZATION_PERMISSIONS as readonly string[]).includes(value);
}
