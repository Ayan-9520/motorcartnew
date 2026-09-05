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
  "finance_eligibility_checks",
  "finance_application_documents",
  "finance_soft_approvals",
  "finance_lender_offers",
  "finance_crm_tasks",
  "customer_vehicles",
  "customer_preferences",
  "vehicle_documents",
  "insurance_wallet",
  "service_records",
  "notification_logs",
  "ai_insights",
  "engagement_campaigns",
  "organizations",
  "organization_members",
  "organization_branches",
  "partner_profiles",
  "partner_badge_assignments",
  "organization_entitlements",
  "quotations",
  "test_drive_bookings",
  "social_posts",
  "community_posts",
  "community_user_profiles",
  "community_business_profiles",
  "community_follows",
  "community_saves",
  "community_reports",
  "customer_consents",
  "crm_activities",
  "opportunities",
  "opportunity_links",
  "partner_coverages",
  "lead_assignments",
  "lead_board_listings",
  "lead_acquisitions",
  "lead_credit_accounts",
  "lead_credit_ledger",
  "lead_calls",
  "crm_tasks",
  "dealer_lead_notes",
  "community_groups",
  "community_group_members",
  "community_role_assignments",
  "community_moderation_flags",
  "post_likes",
  "post_comments",
  "post_shares",
  "post_hashtags",
  "poll_votes",
  "user_follows",
  "organization_subscriptions",
  "commercial_settings",
  "commercial_payments",
  "payment_events",
  "commercial_invoices",
  "commercial_invoice_lines",
  "promotion_orders",
  "partner_payout_accounts",
  "partner_payout_entries",
  "partner_payout_requests",
  "partner_payout_request_items",
  "partner_payout_adjustments",
  "payout_import_batches",
  "payout_import_rows",
  "commercial_payout_rules",
  "commercial_payout_slabs",
  "reconciliation_entries",
  "revenue_allocation_rules",
  "reward_accounts",
  "reward_ledger",
  "reward_rules",
  "motorcart_identities",
  "motorcart_one_tokens",
  "saved_searches",
  "saved_search_matches",
  "vehicle_media_assets",
  "vehicle_sale_requests",
  "vehicle_valuations",
  "vehicle_purchase_offers",
  "scheduled_reminders",
  "communication_providers",
  "communication_policies",
  "communication_threads",
  "communication_messages",
  "communication_webhook_events",
  "call_sessions",
  "call_recordings",
  "call_transcripts",
  "ai_call_summaries",
  "ai_agent_configs",
  "ai_conversations",
  "ai_messages",
  "ai_tool_executions",
  "ai_usage_records",
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
]);

/** Tables a signed-in user may DELETE (narrow; ERPs that currently delete). */
const AUTH_DELETE_TABLES = new Set([
  "post_likes",
  "user_follows",
  "community_follows",
  "new_car_inventory",
  "vehicles",
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
