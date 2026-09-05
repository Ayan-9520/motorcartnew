-- Phase C Finance Marketplace (additive). PostgreSQL.
-- Does not drop columns or alter existing FinanceStatus values.
-- Aligns Prisma with PHASE-C-DATABASE.md while keeping amount/tenure/metadata/user_id.

CREATE TYPE "SoftApprovalStatus" AS ENUM ('none', 'pending', 'pre_approved', 'declined', 'expired');

ALTER TABLE "banks"
  ADD COLUMN "ranking_score" INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN "min_cibil" INTEGER NOT NULL DEFAULT 650,
  ADD COLUMN "short_code" VARCHAR(16);

CREATE INDEX "banks_ranking_score_idx" ON "banks"("ranking_score");

ALTER TABLE "finance_applications"
  ADD COLUMN "loan_amount" DECIMAL(12,2),
  ADD COLUMN "tenure_months" INTEGER,
  ADD COLUMN "vehicle_id" TEXT,
  ADD COLUMN "dsa_agent_id" TEXT,
  ADD COLUMN "interest_rate" DECIMAL(5,2),
  ADD COLUMN "emi_amount" DECIMAL(12,2),
  ADD COLUMN "ai_eligibility_score" INTEGER,
  ADD COLUMN "approval_probability" INTEGER,
  ADD COLUMN "cibil_score" INTEGER,
  ADD COLUMN "monthly_income" BIGINT,
  ADD COLUMN "employment_type" VARCHAR(32) DEFAULT 'salaried',
  ADD COLUMN "application_type" VARCHAR(32) NOT NULL DEFAULT 'new_loan',
  ADD COLUMN "applicant_metadata" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "documents" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "refinance_application_id" TEXT,
  ADD COLUMN "soft_approval_status" "SoftApprovalStatus" NOT NULL DEFAULT 'none',
  ADD COLUMN "soft_approved_at" TIMESTAMP(3),
  ADD COLUMN "comparison_session_id" TEXT;

UPDATE "finance_applications"
SET "loan_amount" = "amount",
    "tenure_months" = "tenure"
WHERE "loan_amount" IS NULL;

ALTER TABLE "finance_applications"
  ALTER COLUMN "loan_amount" SET NOT NULL,
  ALTER COLUMN "tenure_months" SET NOT NULL;

CREATE INDEX "finance_applications_user_id_created_at_idx" ON "finance_applications"("user_id", "created_at");
CREATE INDEX "finance_applications_dsa_agent_id_status_idx" ON "finance_applications"("dsa_agent_id", "status");
CREATE INDEX "finance_applications_bank_id_status_idx" ON "finance_applications"("bank_id", "status");
CREATE INDEX "finance_applications_soft_approval_status_idx" ON "finance_applications"("soft_approval_status");
CREATE INDEX "finance_applications_comparison_session_id_idx" ON "finance_applications"("comparison_session_id");

ALTER TABLE "finance_leads"
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'marketplace',
  ADD COLUMN "product_type" TEXT NOT NULL DEFAULT 'vehicle_loan',
  ADD COLUMN "loan_amount" BIGINT,
  ADD COLUMN "monthly_income" BIGINT,
  ADD COLUMN "cibil_score" INTEGER,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "email" TEXT,
  ADD COLUMN "customer_name" TEXT,
  ADD COLUMN "assigned_dsa_id" TEXT,
  ADD COLUMN "assigned_bank_id" TEXT,
  ADD COLUMN "application_id" TEXT,
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "finance_leads"
SET "assigned_dsa_id" = "dsa_id"
WHERE "assigned_dsa_id" IS NULL AND "dsa_id" IS NOT NULL;

CREATE INDEX "finance_leads_assigned_dsa_id_idx" ON "finance_leads"("assigned_dsa_id");
CREATE INDEX "finance_leads_status_created_at_idx" ON "finance_leads"("status", "created_at");

ALTER TABLE "finance_commissions"
  ADD COLUMN "application_id" TEXT,
  ADD COLUMN "dsa_agent_id" TEXT,
  ADD COLUMN "loan_amount" BIGINT,
  ADD COLUMN "commission_rate" DECIMAL(5,2),
  ADD COLUMN "commission_amount" BIGINT,
  ADD COLUMN "paid_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "finance_commissions_application_id_key" ON "finance_commissions"("application_id");
CREATE INDEX "finance_commissions_dsa_agent_id_created_at_idx" ON "finance_commissions"("dsa_agent_id", "created_at");

ALTER TABLE "finance_verifications"
  ADD COLUMN "check_type" VARCHAR(32),
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "document_path" TEXT,
  ADD COLUMN "reviewed_at" TIMESTAMP(3),
  ADD COLUMN "verified_by" TEXT;

CREATE INDEX "finance_verifications_application_id_idx" ON "finance_verifications"("application_id");

ALTER TABLE "finance_status_history"
  ADD COLUMN "from_status" TEXT,
  ADD COLUMN "to_status" TEXT,
  ADD COLUMN "changed_by" TEXT;

UPDATE "finance_status_history"
SET "to_status" = "status"
WHERE "to_status" IS NULL AND "status" IS NOT NULL;

CREATE INDEX "finance_status_history_application_id_created_at_idx" ON "finance_status_history"("application_id", "created_at");

ALTER TABLE "dsa_agents"
  ADD COLUMN "total_disbursed" BIGINT NOT NULL DEFAULT 0;

CREATE TABLE "finance_lender_offers" (
  "id" TEXT NOT NULL,
  "application_id" TEXT,
  "comparison_session_id" TEXT NOT NULL,
  "bank_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "loan_amount" DECIMAL(12,2) NOT NULL,
  "tenure_months" INTEGER NOT NULL,
  "effective_rate" DECIMAL(5,2) NOT NULL,
  "emi_amount" DECIMAL(12,2) NOT NULL,
  "total_interest" DECIMAL(12,2),
  "approval_probability" INTEGER,
  "rank" INTEGER NOT NULL,
  "is_selected" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "finance_lender_offers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "finance_lender_offers_comparison_session_id_idx" ON "finance_lender_offers"("comparison_session_id");
CREATE INDEX "finance_lender_offers_application_id_idx" ON "finance_lender_offers"("application_id");
CREATE INDEX "finance_lender_offers_user_id_created_at_idx" ON "finance_lender_offers"("user_id", "created_at");

CREATE TABLE "finance_eligibility_checks" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "monthly_income_band" VARCHAR(16) NOT NULL,
  "existing_emi" BIGINT NOT NULL,
  "loan_amount" DECIMAL(12,2) NOT NULL,
  "tenure_months" INTEGER NOT NULL,
  "cibil_band" VARCHAR(16) NOT NULL,
  "employment_type" VARCHAR(32) NOT NULL,
  "eligible" BOOLEAN NOT NULL,
  "max_loan" BIGINT NOT NULL,
  "max_emi" BIGINT NOT NULL,
  "message" VARCHAR(512) NOT NULL,
  "recommended_tenure" INTEGER,
  "engine_version" VARCHAR(16) NOT NULL DEFAULT 'v1',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "finance_eligibility_checks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "finance_eligibility_checks_user_id_created_at_idx" ON "finance_eligibility_checks"("user_id", "created_at");

CREATE TABLE "finance_application_documents" (
  "id" TEXT NOT NULL,
  "application_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "doc_type" VARCHAR(32) NOT NULL,
  "file_name" VARCHAR(255) NOT NULL,
  "file_url" VARCHAR(512) NOT NULL,
  "status" VARCHAR(24) NOT NULL DEFAULT 'uploaded',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "finance_application_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "finance_application_documents_application_id_idx" ON "finance_application_documents"("application_id");

CREATE TABLE "finance_soft_approvals" (
  "id" TEXT NOT NULL,
  "application_id" TEXT NOT NULL,
  "bank_id" TEXT NOT NULL,
  "acted_by" TEXT NOT NULL,
  "decision" VARCHAR(24) NOT NULL,
  "note" TEXT,
  "expires_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "finance_soft_approvals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "finance_soft_approvals_application_id_idx" ON "finance_soft_approvals"("application_id");

CREATE TABLE "finance_crm_tasks" (
  "id" TEXT NOT NULL,
  "application_id" TEXT,
  "lead_id" TEXT,
  "assigned_to" TEXT,
  "dsa_agent_id" TEXT,
  "bank_id" TEXT,
  "task_type" VARCHAR(32) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "due_at" TIMESTAMP(3),
  "status" VARCHAR(24) NOT NULL DEFAULT 'pending',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "finance_crm_tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "finance_crm_tasks_dsa_agent_id_status_idx" ON "finance_crm_tasks"("dsa_agent_id", "status");
CREATE INDEX "finance_crm_tasks_application_id_idx" ON "finance_crm_tasks"("application_id");
