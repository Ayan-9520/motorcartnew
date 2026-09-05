/** VIN match is architecture-ready only until a licensed VIN source exists. */
export const VIN_COMPATIBILITY_LIVE = false;

export const PARTNER_OS_NEVER_ALLOW_TABLES = [
  "organization_dealer_authorizations",
  "organization_coverages",
  "finance_products",
  "insurance_quotes",
  "insurance_policies",
  "insurance_claims",
  "service_slots",
  "service_estimates",
  "service_estimate_items",
  "job_postings",
  "job_applications",
  "professional_experiences",
  "professional_skills",
  "partner_certifications",
  "partner_ratings",
  "part_orders",
  "part_order_items",
  "service_job_cards",
  "service_bookings",
] as const;

export const COVERAGE_DOMAINS = ["VEHICLE", "FINANCE", "INSURANCE", "PARTS", "SERVICE"] as const;
export const AUTH_STATUSES = ["authorized", "pending", "inactive"] as const;
export const QUOTE_KINDS = ["INDICATIVE", "PARTNER_QUOTE", "BOUND"] as const;
export const JOB_APP_STATUSES = ["APPLIED", "SHORTLISTED", "REJECTED", "INTERVIEW", "HIRED", "WITHDRAWN", "CLOSED"] as const;
export const CAREER_PATHS = [
  "SALES",
  "DEALER_OPERATIONS",
  "FINANCE",
  "INSURANCE",
  "SERVICE",
  "PARTS",
  "OEM",
  "MARKETING",
  "AUTOMOTIVE_TECH",
  "OTHER",
] as const;
