import type { JwtPayload } from "@/lib/auth/jwt";

const ADMIN_ROLES = new Set(["super_admin", "admin"]);

const PUBLIC_SELECT_TABLES = new Set([
  "vehicles",
  "dealers",
  "banks",
  "auctions",
  "service_centers",
  "part_products",
  "parts",
  "services",
  "cms_banners",
  "platform_banners",
  "insurance_partners",
  "subscription_plans",
  "community_groups",
  "social_posts",
]);

/** Tables only platform admins may access via generic db/query. */
const ADMIN_ONLY_TABLES = new Set([
  "support_tickets",
  "platform_fraud_alerts",
  "platform_transactions",
  "platform_reports",
  "kyc_submissions",
  "admin_audit_logs",
]);

export function assertDbQueryTableAllowed(
  table: string,
  action: string,
  auth: JwtPayload | null
): { allowed: boolean; reason?: string } {
  if (action === "select" && PUBLIC_SELECT_TABLES.has(table)) {
    return { allowed: true };
  }

  if (!auth) {
    return { allowed: false, reason: "UNAUTHORIZED" };
  }

  if (ADMIN_ONLY_TABLES.has(table) && !ADMIN_ROLES.has(auth.role)) {
    return { allowed: false, reason: "FORBIDDEN" };
  }

  return { allowed: true };
}
