/** Phase 2 — explicit /api/db/query allowlist. Named ops preferred; legacy table+action is role-gated. */

export type QueryAction = "select" | "insert" | "update" | "upsert" | "delete";

export const NAMED_QUERY_OPERATIONS = [
  "vehicle_detail",
  "vehicle_search",
  "dealer_inventory_lookup",
  "create_enquiry",
  "customer_profile",
] as const;

export type NamedQueryOperation = (typeof NAMED_QUERY_OPERATIONS)[number];

export const NEVER_ALLOW_TABLES = new Set([
  "refresh_tokens",
  "otp_codes",
  "password_resets",
  "bank_integration_configs",
  "organizations",
  "organization_members",
  "organization_branches",
  "partner_profiles",
  "partner_badge_assignments",
  "organization_entitlements",
]);

/** Public unauthenticated SELECT only (existing marketplace browse). */
export const PUBLIC_SELECT_TABLES = new Set([
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

/** Tables a signed-in user may DELETE (narrow; ERPs that currently delete). */
const AUTH_DELETE_TABLES = new Set([
  "post_likes",
  "user_follows",
  "community_follows",
  "new_car_inventory",
  "wishlists",
  "poll_votes",
]);

const ADMIN_ROLES = new Set(["admin", "super_admin"]);

export type QueryAuth = {
  userId: string;
  role: string;
} | null;

export type LegacyQueryRequest = {
  table: string;
  action: string;
  filters?: unknown;
};

export type QueryAuthorization =
  | { ok: true }
  | { ok: false; status: 400 | 401 | 403; message: string };

function isAdmin(role: string | undefined): boolean {
  return !!role && ADMIN_ROLES.has(role);
}

function parseIdEqFilter(filters: unknown, userId: string): boolean {
  try {
    const parsed = typeof filters === "string" ? JSON.parse(filters) : filters;
    if (!Array.isArray(parsed)) return false;
    return parsed.some(
      (f: { column?: string; op?: string; value?: string }) =>
        (f.column === "id" || f.column === "user_id" || f.column === "userId") &&
        f.op === "eq" &&
        f.value === userId,
    );
  } catch {
    return false;
  }
}

export function isNamedQueryOperation(value: string): value is NamedQueryOperation {
  return (NAMED_QUERY_OPERATIONS as readonly string[]).includes(value);
}

function envFlag(name: string, defaultOn: boolean): boolean {
  const v = process.env[name];
  if (v === undefined || v === "") return defaultOn;
  const lower = v.toLowerCase();
  return lower === "1" || lower === "true" || lower === "yes";
}

/** When true (default), unknown tables/actions are rejected. Set STRICT_DB_QUERY=false only as an emergency escape. */
export function isStrictDbQueryEnabled(): boolean {
  return envFlag("STRICT_DB_QUERY", true);
}

export function isDevWriteTablesEnabled(): boolean {
  return envFlag("DEV_WRITE_TABLES", false);
}

/**
 * Authorize legacy { table, action } queries.
 * Does not execute Prisma. Unknown tables are rejected when STRICT_DB_QUERY is on.
 */
export function authorizeLegacyQuery(
  auth: QueryAuth,
  req: LegacyQueryRequest,
  knownTables: Set<string>,
): QueryAuthorization {
  const table = req.table.trim();
  const action = (req.action || "select").trim().toLowerCase() as QueryAction;

  if (!table) return { ok: false, status: 400, message: "table required" };
  if (!["select", "insert", "update", "upsert", "delete"].includes(action)) {
    return { ok: false, status: 400, message: "Unsupported action" };
  }
  if (NEVER_ALLOW_TABLES.has(table)) {
    return { ok: false, status: 403, message: "Forbidden" };
  }
  if (!knownTables.has(table)) {
    return { ok: false, status: 400, message: "Unknown operation" };
  }

  if (!auth) {
    if (action === "select" && PUBLIC_SELECT_TABLES.has(table)) return { ok: true };
    if (action === "insert" && table === "leads") return { ok: true };
    if (isDevWriteTablesEnabled() && table === "vehicles" && (action === "insert" || action === "upsert")) {
      return { ok: true };
    }
    return { ok: false, status: 401, message: "Unauthorized" };
  }

  if (table === "users") {
    if (action === "insert" || action === "delete" || action === "upsert") {
      return { ok: false, status: 403, message: "Forbidden" };
    }
    if (isAdmin(auth.role)) return { ok: true };
    if ((action === "select" || action === "update") && parseIdEqFilter(req.filters, auth.userId)) {
      return { ok: true };
    }
    return { ok: false, status: 403, message: "Forbidden" };
  }

  if (action === "delete" && !isAdmin(auth.role) && !AUTH_DELETE_TABLES.has(table)) {
    return { ok: false, status: 403, message: "Forbidden" };
  }

  if (isAdmin(auth.role)) return { ok: true };

  if (!isStrictDbQueryEnabled()) return { ok: true };

  // Authenticated non-admin: allow existing ERP table operations except never-allow / user mutations above.
  return { ok: true };
}

export function sanitizeQueryError(error: unknown): { message: string; status: number } {
  if (error instanceof Error && error.message === "PGRST116") {
    return { message: "Not found", status: 406 };
  }
  if (error instanceof Error && error.message.startsWith("Unknown table:")) {
    return { message: "Unknown operation", status: 400 };
  }
  if (error instanceof Error && error.message.startsWith("Unsupported action:")) {
    return { message: "Unknown operation", status: 400 };
  }
  return { message: "Query failed", status: 500 };
}
