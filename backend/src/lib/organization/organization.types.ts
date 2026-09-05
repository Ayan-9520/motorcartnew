/** Organization types — one model, type-specific metadata elsewhere. */

export const ORGANIZATION_TYPES = [
  "DEALER",
  "OEM",
  "MANUFACTURER",
  "BANK",
  "NBFC",
  "INSURANCE_COMPANY",
  "INSURANCE_BROKER",
  "WORKSHOP",
  "SERVICE_CENTER",
  "PARTS_SELLER",
  "PARTS_MANUFACTURER",
  "AUCTION_PARTNER",
  "FINANCE_DSA",
  "AUTOMOTIVE_PROFESSIONAL",
  "FLEET_OPERATOR",
  "VALUATION_PARTNER",
  "OTHER",
] as const;

export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];

export const ORGANIZATION_STATUSES = ["active", "pending", "suspended", "archived"] as const;
export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number];

export const ORGANIZATION_MEMBER_ROLES = [
  "OWNER",
  "ADMIN",
  "MANAGER",
  "SALES",
  "FINANCE",
  "INSURANCE",
  "SERVICE",
  "PARTS",
  "OPERATIONS",
  "CALL_AGENT",
  "MARKETING",
  "VIEWER",
] as const;

export type OrganizationMemberRole = (typeof ORGANIZATION_MEMBER_ROLES)[number];

export const ORGANIZATION_MEMBER_STATUSES = ["invited", "active", "suspended", "removed"] as const;
export type OrganizationMemberStatus = (typeof ORGANIZATION_MEMBER_STATUSES)[number];

export const PARTNER_VERIFICATION_STATUSES = ["unverified", "pending", "verified", "rejected"] as const;
export type PartnerVerificationStatus = (typeof PARTNER_VERIFICATION_STATUSES)[number];

export const PLATFORM_ADMIN_ROLES = new Set(["admin", "super_admin"]);

/** Existing AppRole values that may own a business organization. Customers are excluded. */
export const BUSINESS_APP_ROLES = new Set([
  "dealer",
  "used_car_dealer",
  "preowned_dealer",
  "new_car_dealer",
  "bike_dealer",
  "truck_dealer",
  "dsa_agent",
  "bank_nbfc",
  "service_center",
  "service_partner",
  "parts_seller",
  "auction_partner",
  "finance_partner",
  "broker",
]);

export function isBusinessAppRole(role: string): boolean {
  return BUSINESS_APP_ROLES.has(role);
}

export function isPlatformAdminRole(role: string): boolean {
  return PLATFORM_ADMIN_ROLES.has(role);
}

/** Compatibility: map existing AppRole → OrganizationType. Does not rewrite AppRole. */
export function organizationTypeFromAppRole(role: string): OrganizationType | null {
  switch (role) {
    case "dealer":
    case "used_car_dealer":
    case "preowned_dealer":
    case "new_car_dealer":
    case "bike_dealer":
    case "truck_dealer":
      return "DEALER";
    case "bank_nbfc":
      return "BANK";
    case "dsa_agent":
      return "FINANCE_DSA";
    case "service_center":
    case "service_partner":
      return "SERVICE_CENTER";
    case "parts_seller":
      return "PARTS_SELLER";
    case "auction_partner":
      return "AUCTION_PARTNER";
    case "broker":
    case "finance_partner":
      return "OTHER";
    default:
      return null;
  }
}

export function isOrganizationMemberRole(value: string): value is OrganizationMemberRole {
  return (ORGANIZATION_MEMBER_ROLES as readonly string[]).includes(value);
}

export function isOrganizationType(value: string): value is OrganizationType {
  return (ORGANIZATION_TYPES as readonly string[]).includes(value);
}
