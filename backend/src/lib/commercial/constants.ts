export const COMMERCIAL_NEVER_ALLOW_TABLES = [
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
] as const;

export const PAYMENT_PURPOSES = [
  "SUBSCRIPTION",
  "LEAD_CREDITS",
  "FEATURED_LISTING",
  "MARKETING",
  "SERVICE",
  "PARTS",
  "OTHER",
] as const;

export const PAYMENT_STATUSES = ["CREATED", "PENDING", "PAID", "FAILED", "REFUNDED", "CANCELLED"] as const;

export const SUBSCRIPTION_STATUSES = ["TRIAL", "ACTIVE", "PAST_DUE", "CANCELLED", "EXPIRED"] as const;

export const PAYOUT_STATUSES = [
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "IN_PROGRESS",
  "PAID",
  "REJECTED",
  "ON_HOLD",
  "REVERSED",
] as const;

export const RECON_STATUSES = ["MATCHED", "PARTIAL", "MISMATCH", "UNMATCHED", "REVIEWED"] as const;

export const REWARD_ENTRY_TYPES = ["EARN", "REDEEM", "EXPIRE", "ADJUST", "REVERSE"] as const;

export const ELIGIBLE_PAYOUT_STATUSES = ["APPROVED"] as const;

export const SETTING_SELLER = "seller.legal";
export const SETTING_TAX = "tax.gst.rates";
