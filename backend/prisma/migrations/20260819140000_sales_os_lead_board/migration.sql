-- Batch 7 — Sales OS: lead quality, consent, CRM timeline, opportunity,
-- PIN lead routing, Lead Board, credits. Additive only. Canonical Lead preserved.

ALTER TABLE "lead_calls" ADD COLUMN "follow_up_at" TIMESTAMP(3);

ALTER TABLE "crm_tasks" ADD COLUMN "opportunity_id" TEXT;
ALTER TABLE "crm_tasks" ADD COLUMN "completed_at" TIMESTAMP(3);
ALTER TABLE "crm_tasks" ADD COLUMN "cancelled_at" TIMESTAMP(3);
CREATE INDEX "crm_tasks_dealer_id_status_due_at_idx" ON "crm_tasks"("dealer_id", "status", "due_at");

ALTER TABLE "leads" ADD COLUMN "customer_user_id" TEXT;
ALTER TABLE "leads" ADD COLUMN "pincode" VARCHAR(6);
ALTER TABLE "leads" ADD COLUMN "quality" VARCHAR(16) NOT NULL DEFAULT 'UNQUALIFIED';
ALTER TABLE "leads" ADD COLUMN "quality_score" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "leads" ADD COLUMN "quality_reason" TEXT;
ALTER TABLE "leads" ADD COLUMN "quality_overridden" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "leads" ADD COLUMN "quality_override_by" TEXT;
ALTER TABLE "leads" ADD COLUMN "quality_override_at" TIMESTAMP(3);

CREATE INDEX "leads_customer_user_id_idx" ON "leads"("customer_user_id");
CREATE INDEX "leads_pincode_idx" ON "leads"("pincode");
CREATE INDEX "leads_quality_idx" ON "leads"("quality");

ALTER TABLE "leads" ADD CONSTRAINT "leads_customer_user_id_fkey"
  FOREIGN KEY ("customer_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "customer_consents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "lead_id" TEXT,
    "channel" VARCHAR(16) NOT NULL,
    "purpose" VARCHAR(32) NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'GRANTED',
    "source" VARCHAR(64) NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawn_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_consents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_consents_user_id_status_idx" ON "customer_consents"("user_id", "status");
CREATE INDEX "customer_consents_lead_id_idx" ON "customer_consents"("lead_id");
CREATE INDEX "customer_consents_channel_purpose_idx" ON "customer_consents"("channel", "purpose");

ALTER TABLE "customer_consents" ADD CONSTRAINT "customer_consents_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_consents" ADD CONSTRAINT "customer_consents_lead_id_fkey"
  FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "customer_user_id" TEXT,
    "dealer_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "vehicle_id" TEXT,
    "inventory_id" TEXT,
    "status" VARCHAR(24) NOT NULL DEFAULT 'OPEN',
    "quality" VARCHAR(16),
    "estimated_value" DECIMAL(12,2),
    "owner_user_id" TEXT NOT NULL,
    "next_follow_up_at" TIMESTAMP(3),
    "lost_reason" TEXT,
    "won_at" TIMESTAMP(3),
    "lost_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "opportunities_dealer_id_status_idx" ON "opportunities"("dealer_id", "status");
CREATE INDEX "opportunities_lead_id_idx" ON "opportunities"("lead_id");
CREATE INDEX "opportunities_owner_user_id_idx" ON "opportunities"("owner_user_id");
CREATE INDEX "opportunities_organization_id_idx" ON "opportunities"("organization_id");

ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_lead_id_fkey"
  FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_dealer_id_fkey"
  FOREIGN KEY ("dealer_id") REFERENCES "dealers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_owner_user_id_fkey"
  FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "opportunity_links" (
    "id" TEXT NOT NULL,
    "opportunity_id" TEXT NOT NULL,
    "object_type" VARCHAR(24) NOT NULL,
    "object_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opportunity_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "opportunity_links_opportunity_id_object_type_object_id_key"
  ON "opportunity_links"("opportunity_id", "object_type", "object_id");
CREATE INDEX "opportunity_links_object_type_object_id_idx" ON "opportunity_links"("object_type", "object_id");

ALTER TABLE "opportunity_links" ADD CONSTRAINT "opportunity_links_opportunity_id_fkey"
  FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "crm_activities" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "opportunity_id" TEXT,
    "dealer_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "actor_user_id" TEXT NOT NULL,
    "activity_type" VARCHAR(32) NOT NULL,
    "subject" VARCHAR(160) NOT NULL,
    "notes" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "crm_activities_dealer_id_created_at_idx" ON "crm_activities"("dealer_id", "created_at");
CREATE INDEX "crm_activities_lead_id_created_at_idx" ON "crm_activities"("lead_id", "created_at");
CREATE INDEX "crm_activities_opportunity_id_idx" ON "crm_activities"("opportunity_id");

ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_lead_id_fkey"
  FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_opportunity_id_fkey"
  FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_dealer_id_fkey"
  FOREIGN KEY ("dealer_id") REFERENCES "dealers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "partner_coverages" (
    "id" TEXT NOT NULL,
    "dealer_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "branch_id" TEXT,
    "domain" VARCHAR(24) NOT NULL,
    "postal_code" VARCHAR(6) NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    "priority" INTEGER NOT NULL DEFAULT 100,
    "capacity" INTEGER,
    "routing_mode" VARCHAR(16) NOT NULL DEFAULT 'STANDARD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_coverages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partner_coverages_dealer_id_domain_postal_code_key"
  ON "partner_coverages"("dealer_id", "domain", "postal_code");
CREATE INDEX "partner_coverages_domain_postal_code_status_idx"
  ON "partner_coverages"("domain", "postal_code", "status");
CREATE INDEX "partner_coverages_organization_id_idx" ON "partner_coverages"("organization_id");

ALTER TABLE "partner_coverages" ADD CONSTRAINT "partner_coverages_dealer_id_fkey"
  FOREIGN KEY ("dealer_id") REFERENCES "dealers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partner_coverages" ADD CONSTRAINT "partner_coverages_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "lead_assignments" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "dealer_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "assigned_user_id" TEXT,
    "routing_reason" TEXT NOT NULL,
    "routing_mode" VARCHAR(16) NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'ASSIGNED',
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lead_assignments_lead_id_assigned_at_idx" ON "lead_assignments"("lead_id", "assigned_at");
CREATE INDEX "lead_assignments_dealer_id_status_idx" ON "lead_assignments"("dealer_id", "status");

ALTER TABLE "lead_assignments" ADD CONSTRAINT "lead_assignments_lead_id_fkey"
  FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_assignments" ADD CONSTRAINT "lead_assignments_dealer_id_fkey"
  FOREIGN KEY ("dealer_id") REFERENCES "dealers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "lead_board_listings" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'AVAILABLE',
    "routing_mode" VARCHAR(16) NOT NULL,
    "credit_cost" INTEGER NOT NULL,
    "shared_limit" INTEGER NOT NULL DEFAULT 1,
    "acquire_count" INTEGER NOT NULL DEFAULT 0,
    "product_category" VARCHAR(64),
    "city" VARCHAR(64),
    "pincode" VARCHAR(6),
    "published_by" TEXT NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawn_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_board_listings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lead_board_listings_lead_id_key" ON "lead_board_listings"("lead_id");
CREATE INDEX "lead_board_listings_status_published_at_idx" ON "lead_board_listings"("status", "published_at");
CREATE INDEX "lead_board_listings_pincode_idx" ON "lead_board_listings"("pincode");

ALTER TABLE "lead_board_listings" ADD CONSTRAINT "lead_board_listings_lead_id_fkey"
  FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "lead_acquisitions" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "dealer_id" TEXT NOT NULL,
    "acquired_by" TEXT NOT NULL,
    "credit_cost" INTEGER NOT NULL,
    "ledger_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_acquisitions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lead_acquisitions_listing_id_dealer_id_key" ON "lead_acquisitions"("listing_id", "dealer_id");
CREATE INDEX "lead_acquisitions_dealer_id_created_at_idx" ON "lead_acquisitions"("dealer_id", "created_at");

ALTER TABLE "lead_acquisitions" ADD CONSTRAINT "lead_acquisitions_listing_id_fkey"
  FOREIGN KEY ("listing_id") REFERENCES "lead_board_listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lead_acquisitions" ADD CONSTRAINT "lead_acquisitions_dealer_id_fkey"
  FOREIGN KEY ("dealer_id") REFERENCES "dealers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "lead_credit_accounts" (
    "id" TEXT NOT NULL,
    "dealer_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_credit_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lead_credit_accounts_dealer_id_key" ON "lead_credit_accounts"("dealer_id");

ALTER TABLE "lead_credit_accounts" ADD CONSTRAINT "lead_credit_accounts_dealer_id_fkey"
  FOREIGN KEY ("dealer_id") REFERENCES "dealers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "lead_credit_ledger" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "entry_type" VARCHAR(16) NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "reason" VARCHAR(160) NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_credit_ledger_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lead_credit_ledger_account_id_created_at_idx" ON "lead_credit_ledger"("account_id", "created_at");

ALTER TABLE "lead_credit_ledger" ADD CONSTRAINT "lead_credit_ledger_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "lead_credit_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
