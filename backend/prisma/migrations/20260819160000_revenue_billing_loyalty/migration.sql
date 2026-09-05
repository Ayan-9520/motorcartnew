-- Batch 8 — Revenue, billing, payouts, GST foundation, loyalty ledger.
-- Additive only. Does not replace FinanceCommission, LeadCreditLedger, or entitlements.

ALTER TABLE "subscription_plans" ADD COLUMN "currency" VARCHAR(3) NOT NULL DEFAULT 'INR';
ALTER TABLE "subscription_plans" ADD COLUMN "billing_cycle" VARCHAR(16) NOT NULL DEFAULT 'monthly';
ALTER TABLE "subscription_plans" ADD COLUMN "status" VARCHAR(16) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "subscription_plans" ADD COLUMN "included_features" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "subscription_plans" ADD COLUMN "included_limits" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "subscription_plans" ADD COLUMN "included_lead_credits" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "subscription_plans" ADD COLUMN "trial_days" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "subscription_plans" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "organization_subscriptions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "billing_cycle" VARCHAR(16) NOT NULL,
    "status" VARCHAR(16) NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "trial_ends_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "organization_subscriptions_organization_id_status_idx" ON "organization_subscriptions"("organization_id", "status");
CREATE INDEX "organization_subscriptions_plan_id_idx" ON "organization_subscriptions"("plan_id");

ALTER TABLE "organization_subscriptions" ADD CONSTRAINT "organization_subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_subscriptions" ADD CONSTRAINT "organization_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "commercial_settings" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commercial_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "commercial_settings_key_key" ON "commercial_settings"("key");

CREATE TABLE "commercial_payments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "user_id" TEXT,
    "purpose" VARCHAR(32) NOT NULL,
    "reference_type" VARCHAR(48),
    "reference_id" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" VARCHAR(16) NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "provider_ref" TEXT,
    "paid_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commercial_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "commercial_payments_provider_ref_key" ON "commercial_payments"("provider_ref");
CREATE INDEX "commercial_payments_organization_id_status_idx" ON "commercial_payments"("organization_id", "status");
CREATE INDEX "commercial_payments_user_id_status_idx" ON "commercial_payments"("user_id", "status");
CREATE INDEX "commercial_payments_purpose_status_idx" ON "commercial_payments"("purpose", "status");

ALTER TABLE "commercial_payments" ADD CONSTRAINT "commercial_payments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "commercial_payments" ADD CONSTRAINT "commercial_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "payment_events" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "provider_event_id" TEXT NOT NULL,
    "event_type" VARCHAR(48) NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_events_provider_provider_event_id_key" ON "payment_events"("provider", "provider_event_id");
CREATE INDEX "payment_events_payment_id_idx" ON "payment_events"("payment_id");

ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "commercial_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lead_credit_ledger" ADD COLUMN "payment_id" TEXT;
CREATE UNIQUE INDEX "lead_credit_ledger_payment_id_key" ON "lead_credit_ledger"("payment_id");
ALTER TABLE "lead_credit_ledger" ADD CONSTRAINT "lead_credit_ledger_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "commercial_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "commercial_invoices" (
    "id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "kind" VARCHAR(40) NOT NULL,
    "organization_id" TEXT NOT NULL,
    "payment_id" TEXT,
    "invoice_date" TIMESTAMP(3) NOT NULL,
    "seller_legal_name" TEXT,
    "seller_gstin" VARCHAR(20),
    "buyer_gstin" VARCHAR(20),
    "billing_address" JSONB NOT NULL DEFAULT '{}',
    "place_of_supply" TEXT,
    "taxable_value" DECIMAL(14,2) NOT NULL,
    "cgst" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "sgst" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "igst" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "other_charges" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" VARCHAR(16) NOT NULL,
    "issued_at" TIMESTAMP(3),
    "voided_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commercial_invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "commercial_invoices_invoice_number_key" ON "commercial_invoices"("invoice_number");
CREATE UNIQUE INDEX "commercial_invoices_organization_id_payment_id_kind_key" ON "commercial_invoices"("organization_id", "payment_id", "kind");
CREATE INDEX "commercial_invoices_organization_id_status_idx" ON "commercial_invoices"("organization_id", "status");

ALTER TABLE "commercial_invoices" ADD CONSTRAINT "commercial_invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commercial_invoices" ADD CONSTRAINT "commercial_invoices_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "commercial_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "commercial_invoice_lines" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hsn_sac" VARCHAR(16),
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(14,2) NOT NULL,
    "taxable_value" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "commercial_invoice_lines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "commercial_invoice_lines_invoice_id_idx" ON "commercial_invoice_lines"("invoice_id");
ALTER TABLE "commercial_invoice_lines" ADD CONSTRAINT "commercial_invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "commercial_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "promotion_orders" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "product_type" VARCHAR(40) NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "status" VARCHAR(16) NOT NULL,
    "payment_id" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_orders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "promotion_orders_organization_id_status_idx" ON "promotion_orders"("organization_id", "status");
ALTER TABLE "promotion_orders" ADD CONSTRAINT "promotion_orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "promotion_orders" ADD CONSTRAINT "promotion_orders_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "commercial_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "partner_payout_accounts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_payout_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partner_payout_accounts_organization_id_key" ON "partner_payout_accounts"("organization_id");
ALTER TABLE "partner_payout_accounts" ADD CONSTRAINT "partner_payout_accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "partner_payout_entries" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "source_type" VARCHAR(32) NOT NULL,
    "source_id" TEXT,
    "finance_commission_id" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" VARCHAR(16) NOT NULL,
    "product" VARCHAR(80),
    "period" VARCHAR(16),
    "original_entry_id" TEXT,
    "reason" VARCHAR(240),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_payout_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partner_payout_entries_finance_commission_id_key" ON "partner_payout_entries"("finance_commission_id");
CREATE UNIQUE INDEX "partner_payout_entries_source_type_source_id_key" ON "partner_payout_entries"("source_type", "source_id");
CREATE INDEX "partner_payout_entries_organization_id_status_idx" ON "partner_payout_entries"("organization_id", "status");
ALTER TABLE "partner_payout_entries" ADD CONSTRAINT "partner_payout_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "partner_payout_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" VARCHAR(16) NOT NULL,
    "review_note" VARCHAR(240),
    "reviewed_by" TEXT,
    "paid_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_payout_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "partner_payout_requests_organization_id_status_idx" ON "partner_payout_requests"("organization_id", "status");
ALTER TABLE "partner_payout_requests" ADD CONSTRAINT "partner_payout_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "partner_payout_request_items" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "entry_id" TEXT NOT NULL,

    CONSTRAINT "partner_payout_request_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partner_payout_request_items_entry_id_key" ON "partner_payout_request_items"("entry_id");
CREATE INDEX "partner_payout_request_items_request_id_idx" ON "partner_payout_request_items"("request_id");
ALTER TABLE "partner_payout_request_items" ADD CONSTRAINT "partner_payout_request_items_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "partner_payout_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partner_payout_request_items" ADD CONSTRAINT "partner_payout_request_items_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "partner_payout_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "partner_payout_adjustments" (
    "id" TEXT NOT NULL,
    "entry_id" TEXT NOT NULL,
    "kind" VARCHAR(24) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "reason" VARCHAR(240) NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_payout_adjustments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "partner_payout_adjustments_entry_id_idx" ON "partner_payout_adjustments"("entry_id");
ALTER TABLE "partner_payout_adjustments" ADD CONSTRAINT "partner_payout_adjustments_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "partner_payout_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "payout_import_batches" (
    "id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_hash" TEXT NOT NULL,
    "status" VARCHAR(16) NOT NULL,
    "period" VARCHAR(16),
    "row_count" INTEGER NOT NULL DEFAULT 0,
    "valid_count" INTEGER NOT NULL DEFAULT 0,
    "invalid_count" INTEGER NOT NULL DEFAULT 0,
    "actor_user_id" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),

    CONSTRAINT "payout_import_batches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payout_import_batches_file_hash_key" ON "payout_import_batches"("file_hash");

CREATE TABLE "payout_import_rows" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "row_number" INTEGER NOT NULL,
    "period" VARCHAR(16),
    "bank" VARCHAR(80),
    "product" VARCHAR(80),
    "reference" VARCHAR(120),
    "application_ref" VARCHAR(120),
    "disbursed_amount" DECIMAL(14,2),
    "payout_rate" DECIMAL(8,4),
    "gross_payout" DECIMAL(14,2),
    "adjustment" DECIMAL(14,2),
    "row_status" VARCHAR(24) NOT NULL,
    "errors" JSONB NOT NULL DEFAULT '[]',
    "warning" VARCHAR(240),
    "fingerprint" VARCHAR(64) NOT NULL,
    "posted_entry_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_import_rows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payout_import_rows_batch_id_fingerprint_key" ON "payout_import_rows"("batch_id", "fingerprint");
CREATE INDEX "payout_import_rows_batch_id_row_status_idx" ON "payout_import_rows"("batch_id", "row_status");
ALTER TABLE "payout_import_rows" ADD CONSTRAINT "payout_import_rows_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "payout_import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "commercial_payout_rules" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "bank" VARCHAR(80),
    "product" VARCHAR(80) NOT NULL,
    "period" VARCHAR(16),
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_to" TIMESTAMP(3),
    "partner_share_percent" DECIMAL(8,4),
    "motorcart_share_percent" DECIMAL(8,4),
    "fixed_amount" DECIMAL(14,2),
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commercial_payout_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "commercial_payout_rules_product_valid_from_idx" ON "commercial_payout_rules"("product", "valid_from");
ALTER TABLE "commercial_payout_rules" ADD CONSTRAINT "commercial_payout_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "commercial_payout_slabs" (
    "id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "min_inclusive" DECIMAL(14,2) NOT NULL,
    "max_exclusive" DECIMAL(14,2),
    "percent" DECIMAL(8,4) NOT NULL,

    CONSTRAINT "commercial_payout_slabs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "commercial_payout_slabs_rule_id_idx" ON "commercial_payout_slabs"("rule_id");
ALTER TABLE "commercial_payout_slabs" ADD CONSTRAINT "commercial_payout_slabs_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "commercial_payout_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "reconciliation_entries" (
    "id" TEXT NOT NULL,
    "source" VARCHAR(40) NOT NULL,
    "period" VARCHAR(16) NOT NULL,
    "expected_amount" DECIMAL(14,2) NOT NULL,
    "received_amount" DECIMAL(14,2) NOT NULL,
    "difference" DECIMAL(14,2) NOT NULL,
    "status" VARCHAR(16) NOT NULL,
    "reference" VARCHAR(120),
    "reviewed_by" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reconciliation_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reconciliation_entries_source_period_status_idx" ON "reconciliation_entries"("source", "period", "status");

CREATE TABLE "revenue_allocation_rules" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "team" VARCHAR(80),
    "employee_user_id" TEXT,
    "role" VARCHAR(40),
    "percent" DECIMAL(8,4) NOT NULL,
    "period" VARCHAR(16),
    "source" VARCHAR(40) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_allocation_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reward_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reward_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "reward_accounts_user_id_key" ON "reward_accounts"("user_id");
ALTER TABLE "reward_accounts" ADD CONSTRAINT "reward_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "reward_ledger" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "entry_type" VARCHAR(16) NOT NULL,
    "points" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "reason" VARCHAR(160) NOT NULL,
    "source" VARCHAR(40) NOT NULL,
    "source_ref" TEXT,
    "source_event_key" TEXT,
    "expires_at" TIMESTAMP(3),
    "status" VARCHAR(16) NOT NULL DEFAULT 'POSTED',
    "actor_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_ledger_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "reward_ledger_source_event_key_key" ON "reward_ledger"("source_event_key");
CREATE INDEX "reward_ledger_account_id_created_at_idx" ON "reward_ledger"("account_id", "created_at");
ALTER TABLE "reward_ledger" ADD CONSTRAINT "reward_ledger_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "reward_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "reward_rules" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "source" VARCHAR(40) NOT NULL,
    "points" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "allow_negative" BOOLEAN NOT NULL DEFAULT false,
    "expiry_days" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reward_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "reward_rules_code_key" ON "reward_rules"("code");
CREATE INDEX "reward_rules_source_active_idx" ON "reward_rules"("source", "active");
