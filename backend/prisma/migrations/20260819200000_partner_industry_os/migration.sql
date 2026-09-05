-- Batch 11 Partner / Industry OS. Additive only.

ALTER TABLE "part_products" ADD COLUMN IF NOT EXISTS "organization_id" TEXT;
ALTER TABLE "part_products" ADD COLUMN IF NOT EXISTS "part_number" VARCHAR(80);
ALTER TABLE "part_products" ADD COLUMN IF NOT EXISTS "manufacturer" VARCHAR(80);
ALTER TABLE "part_products" ADD COLUMN IF NOT EXISTS "classification" VARCHAR(24);
ALTER TABLE "part_products" ADD COLUMN IF NOT EXISTS "vehicle_category" VARCHAR(32);
ALTER TABLE "part_products" ADD COLUMN IF NOT EXISTS "pincode" VARCHAR(6);
ALTER TABLE "part_products" ADD COLUMN IF NOT EXISTS "status" VARCHAR(16) NOT NULL DEFAULT 'ACTIVE';
CREATE INDEX IF NOT EXISTS "part_products_pincode_idx" ON "part_products"("pincode");

ALTER TABLE "part_orders" ADD COLUMN IF NOT EXISTS "organization_id" TEXT;
ALTER TABLE "part_orders" ADD COLUMN IF NOT EXISTS "fulfillment_status" VARCHAR(24) NOT NULL DEFAULT 'UNFULFILLED';
ALTER TABLE "part_orders" ADD COLUMN IF NOT EXISTS "payment_ref" VARCHAR(80);
CREATE INDEX IF NOT EXISTS "part_orders_seller_id_idx" ON "part_orders"("seller_id");

ALTER TABLE "banks" ADD COLUMN IF NOT EXISTS "organization_id" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "banks_organization_id_key" ON "banks"("organization_id");

ALTER TABLE "insurance_partners" ADD COLUMN IF NOT EXISTS "organization_id" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "insurance_partners_organization_id_key" ON "insurance_partners"("organization_id");

ALTER TABLE "insurance_quotes" ADD COLUMN IF NOT EXISTS "quote_kind" VARCHAR(24) NOT NULL DEFAULT 'INDICATIVE';

ALTER TABLE "service_job_cards" ADD COLUMN IF NOT EXISTS "customer_user_id" TEXT;
ALTER TABLE "service_job_cards" ADD COLUMN IF NOT EXISTS "technician_user_id" TEXT;
ALTER TABLE "service_job_cards" ADD COLUMN IF NOT EXISTS "complaint" TEXT;
ALTER TABLE "service_job_cards" ADD COLUMN IF NOT EXISTS "inspection" TEXT;
ALTER TABLE "service_job_cards" ADD COLUMN IF NOT EXISTS "recommended_work" TEXT;
ALTER TABLE "service_job_cards" ADD COLUMN IF NOT EXISTS "approved_work" TEXT;
ALTER TABLE "service_job_cards" ADD COLUMN IF NOT EXISTS "parts_used" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "service_job_cards" ADD COLUMN IF NOT EXISTS "labour_amount" DECIMAL(12,2);
ALTER TABLE "service_job_cards" ADD COLUMN IF NOT EXISTS "estimate_id" TEXT;
ALTER TABLE "service_job_cards" ADD COLUMN IF NOT EXISTS "invoice_ref" VARCHAR(80);
ALTER TABLE "service_job_cards" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "service_job_cards" ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP(3);

CREATE TABLE "organization_dealer_authorizations" (
    "id" TEXT NOT NULL,
    "oem_organization_id" TEXT NOT NULL,
    "dealer_organization_id" TEXT NOT NULL,
    "dealer_id" TEXT,
    "brand" VARCHAR(80) NOT NULL,
    "region" VARCHAR(80),
    "branch_id" TEXT,
    "status" VARCHAR(16) NOT NULL DEFAULT 'pending',
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "organization_dealer_authorizations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "organization_dealer_authorizations_oem_dealer_brand_key" ON "organization_dealer_authorizations"("oem_organization_id", "dealer_organization_id", "brand");
CREATE INDEX "organization_dealer_authorizations_dealer_status_idx" ON "organization_dealer_authorizations"("dealer_organization_id", "status");
ALTER TABLE "organization_dealer_authorizations" ADD CONSTRAINT "organization_dealer_authorizations_oem_fkey" FOREIGN KEY ("oem_organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_dealer_authorizations" ADD CONSTRAINT "organization_dealer_authorizations_dealer_fkey" FOREIGN KEY ("dealer_organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "organization_coverages" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "domain" VARCHAR(24) NOT NULL,
    "postal_code" VARCHAR(6) NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "organization_coverages_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "organization_coverages_org_domain_pin_key" ON "organization_coverages"("organization_id", "domain", "postal_code");
CREATE INDEX "organization_coverages_domain_pin_status_idx" ON "organization_coverages"("domain", "postal_code", "status");
ALTER TABLE "organization_coverages" ADD CONSTRAINT "organization_coverages_org_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "finance_products" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "bank_id" TEXT,
    "name" VARCHAR(120) NOT NULL,
    "loan_type" VARCHAR(40) NOT NULL,
    "vehicle_category" VARCHAR(40),
    "min_amount" DECIMAL(12,2) NOT NULL,
    "max_amount" DECIMAL(12,2) NOT NULL,
    "tenure_min_months" INTEGER NOT NULL,
    "tenure_max_months" INTEGER NOT NULL,
    "rate_min" DECIMAL(5,2),
    "rate_max" DECIMAL(5,2),
    "processing_fee" VARCHAR(80),
    "eligibility" JSONB NOT NULL DEFAULT '{}',
    "active_from" TIMESTAMP(3),
    "active_until" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "finance_products_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "finance_products_org_active_idx" ON "finance_products"("organization_id", "is_active");
ALTER TABLE "finance_products" ADD CONSTRAINT "finance_products_org_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "insurance_policies" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "customer_user_id" TEXT NOT NULL,
    "vehicle_id" TEXT,
    "partner_id" TEXT,
    "policy_number" VARCHAR(80) NOT NULL,
    "policy_type" VARCHAR(40) NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "expiry_at" TIMESTAMP(3) NOT NULL,
    "premium" DECIMAL(12,2),
    "status" VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    "documents" JSONB NOT NULL DEFAULT '[]',
    "renewal_of_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "insurance_policies_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "insurance_policies_org_number_key" ON "insurance_policies"("organization_id", "policy_number");
CREATE INDEX "insurance_policies_customer_idx" ON "insurance_policies"("customer_user_id");
CREATE INDEX "insurance_policies_expiry_idx" ON "insurance_policies"("expiry_at");
ALTER TABLE "insurance_policies" ADD CONSTRAINT "insurance_policies_org_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "insurance_claims" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "customer_user_id" TEXT NOT NULL,
    "vehicle_id" TEXT,
    "incident_at" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "documents" JSONB NOT NULL DEFAULT '[]',
    "status" VARCHAR(24) NOT NULL DEFAULT 'NOTIFIED',
    "insurer_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "insurance_claims_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "insurance_claims_org_status_idx" ON "insurance_claims"("organization_id", "status");
CREATE INDEX "insurance_claims_customer_idx" ON "insurance_claims"("customer_user_id");
ALTER TABLE "insurance_claims" ADD CONSTRAINT "insurance_claims_org_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "insurance_claims" ADD CONSTRAINT "insurance_claims_policy_fkey" FOREIGN KEY ("policy_id") REFERENCES "insurance_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "service_slots" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "service_center_id" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "booked_count" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(16) NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_slots_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "service_slots_center_starts_idx" ON "service_slots"("service_center_id", "starts_at");
ALTER TABLE "service_slots" ADD CONSTRAINT "service_slots_org_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "service_estimates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "service_center_id" TEXT NOT NULL,
    "booking_id" TEXT,
    "job_card_id" TEXT,
    "customer_user_id" TEXT NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "service_estimates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "service_estimates_center_idx" ON "service_estimates"("service_center_id");
CREATE INDEX "service_estimates_customer_idx" ON "service_estimates"("customer_user_id");
ALTER TABLE "service_estimates" ADD CONSTRAINT "service_estimates_org_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "service_estimate_items" (
    "id" TEXT NOT NULL,
    "estimate_id" TEXT NOT NULL,
    "description" VARCHAR(200) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "rejected" BOOLEAN NOT NULL DEFAULT false,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_estimate_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "service_estimate_items_estimate_idx" ON "service_estimate_items"("estimate_id");
ALTER TABLE "service_estimate_items" ADD CONSTRAINT "service_estimate_items_estimate_fkey" FOREIGN KEY ("estimate_id") REFERENCES "service_estimates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "job_postings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "department" VARCHAR(80),
    "location" VARCHAR(80),
    "employment_type" VARCHAR(24) NOT NULL DEFAULT 'FULL_TIME',
    "experience" VARCHAR(80),
    "skills" JSONB NOT NULL DEFAULT '[]',
    "description" TEXT NOT NULL,
    "salary_min" INTEGER,
    "salary_max" INTEGER,
    "career_path" VARCHAR(40),
    "status" VARCHAR(16) NOT NULL DEFAULT 'OPEN',
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "job_postings_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "job_postings_org_status_idx" ON "job_postings"("organization_id", "status");
CREATE INDEX "job_postings_status_created_idx" ON "job_postings"("status", "created_at");
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_org_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "job_applications" (
    "id" TEXT NOT NULL,
    "job_posting_id" TEXT NOT NULL,
    "candidate_user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "cover_note" TEXT,
    "cv_ref" VARCHAR(160),
    "status" VARCHAR(24) NOT NULL DEFAULT 'APPLIED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "withdrawn_at" TIMESTAMP(3),
    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "job_applications_job_candidate_key" ON "job_applications"("job_posting_id", "candidate_user_id");
CREATE INDEX "job_applications_org_status_idx" ON "job_applications"("organization_id", "status");
CREATE INDEX "job_applications_candidate_idx" ON "job_applications"("candidate_user_id");
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_job_fkey" FOREIGN KEY ("job_posting_id") REFERENCES "job_postings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_candidate_fkey" FOREIGN KEY ("candidate_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "professional_experiences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "company" VARCHAR(120) NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3),
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "professional_experiences_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "professional_experiences_user_idx" ON "professional_experiences"("user_id");
ALTER TABLE "professional_experiences" ADD CONSTRAINT "professional_experiences_user_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "professional_skills" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "professional_skills_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "professional_skills_user_name_key" ON "professional_skills"("user_id", "name");
ALTER TABLE "professional_skills" ADD CONSTRAINT "professional_skills_user_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "partner_certifications" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    "evidence" JSONB NOT NULL DEFAULT '{}',
    "assigned_by" VARCHAR(32) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "partner_certifications_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "partner_certifications_org_code_key" ON "partner_certifications"("organization_id", "code");
ALTER TABLE "partner_certifications" ADD CONSTRAINT "partner_certifications_org_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "partner_ratings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "reviewer_user_id" TEXT NOT NULL,
    "overall" INTEGER NOT NULL,
    "response" INTEGER,
    "pricing" INTEGER,
    "service" INTEGER,
    "experience" INTEGER,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "partner_ratings_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "partner_ratings_org_idx" ON "partner_ratings"("organization_id");
ALTER TABLE "partner_ratings" ADD CONSTRAINT "partner_ratings_org_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partner_ratings" ADD CONSTRAINT "partner_ratings_reviewer_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
