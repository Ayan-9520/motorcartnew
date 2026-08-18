-- Phase 3 Organization / Partner foundation (PROPOSED — not applied).
-- ADDITIVE ONLY. Does not alter users, dealers, vehicles, leads, or bookings.
-- To apply after approval: copy this folder to prisma/migrations/ then `npx prisma migrate deploy`.

CREATE TYPE "OrganizationType" AS ENUM (
  'DEALER',
  'OEM',
  'MANUFACTURER',
  'BANK',
  'NBFC',
  'INSURANCE_COMPANY',
  'INSURANCE_BROKER',
  'WORKSHOP',
  'SERVICE_CENTER',
  'PARTS_SELLER',
  'PARTS_MANUFACTURER',
  'AUCTION_PARTNER',
  'FINANCE_DSA',
  'AUTOMOTIVE_PROFESSIONAL',
  'FLEET_OPERATOR',
  'OTHER'
);

CREATE TYPE "OrganizationStatus" AS ENUM ('active', 'pending', 'suspended', 'archived');

CREATE TYPE "OrganizationMemberRole" AS ENUM (
  'OWNER',
  'ADMIN',
  'MANAGER',
  'SALES',
  'FINANCE',
  'INSURANCE',
  'SERVICE',
  'PARTS',
  'OPERATIONS',
  'CALL_AGENT',
  'MARKETING',
  'VIEWER'
);

CREATE TYPE "OrganizationMemberStatus" AS ENUM ('invited', 'active', 'suspended', 'removed');

CREATE TYPE "PartnerVerificationStatus" AS ENUM ('unverified', 'pending', 'verified', 'rejected');

CREATE TABLE "organizations" (
  "id" TEXT NOT NULL,
  "type" "OrganizationType" NOT NULL,
  "status" "OrganizationStatus" NOT NULL DEFAULT 'active',
  "name" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "plan_slug" VARCHAR(32) NOT NULL DEFAULT 'free',
  "legacy_dealer_id" TEXT,
  "type_metadata" JSONB NOT NULL DEFAULT '{}',
  "created_by_user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");
CREATE UNIQUE INDEX "organizations_legacy_dealer_id_key" ON "organizations"("legacy_dealer_id");
CREATE INDEX "organizations_type_status_idx" ON "organizations"("type", "status");
CREATE INDEX "organizations_created_by_user_id_idx" ON "organizations"("created_by_user_id");

ALTER TABLE "organizations"
  ADD CONSTRAINT "organizations_legacy_dealer_id_fkey"
  FOREIGN KEY ("legacy_dealer_id") REFERENCES "dealers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "organization_branches" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "is_headquarters" BOOLEAN NOT NULL DEFAULT false,
  "address" TEXT,
  "city" TEXT,
  "state" TEXT,
  "country" TEXT NOT NULL DEFAULT 'IN',
  "postal_code" VARCHAR(16),
  "latitude" DECIMAL(10,7),
  "longitude" DECIMAL(10,7),
  "contact_number" TEXT,
  "business_hours" JSONB NOT NULL DEFAULT '{}',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "organization_branches_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "organization_branches_organization_id_idx" ON "organization_branches"("organization_id");
CREATE INDEX "organization_branches_country_postal_code_idx" ON "organization_branches"("country", "postal_code");

ALTER TABLE "organization_branches"
  ADD CONSTRAINT "organization_branches_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "organization_members" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role" "OrganizationMemberRole" NOT NULL DEFAULT 'VIEWER',
  "status" "OrganizationMemberStatus" NOT NULL DEFAULT 'active',
  "branch_id" TEXT,
  "department" TEXT,
  "permissions" JSONB NOT NULL DEFAULT '[]',
  "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organization_members_organization_id_user_id_key" ON "organization_members"("organization_id", "user_id");
CREATE INDEX "organization_members_user_id_idx" ON "organization_members"("user_id");
CREATE INDEX "organization_members_organization_id_status_idx" ON "organization_members"("organization_id", "status");

ALTER TABLE "organization_members"
  ADD CONSTRAINT "organization_members_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_members"
  ADD CONSTRAINT "organization_members_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_members"
  ADD CONSTRAINT "organization_members_branch_id_fkey"
  FOREIGN KEY ("branch_id") REFERENCES "organization_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "partner_profiles" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "business_name" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "logo_url" TEXT,
  "description" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "website" TEXT,
  "verification_status" "PartnerVerificationStatus" NOT NULL DEFAULT 'unverified',
  "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
  "services" JSONB NOT NULL DEFAULT '[]',
  "categories" JSONB NOT NULL DEFAULT '[]',
  "business_hours" JSONB NOT NULL DEFAULT '{}',
  "social_links" JSONB NOT NULL DEFAULT '{}',
  "certifications" JSONB NOT NULL DEFAULT '[]',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "partner_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partner_profiles_organization_id_key" ON "partner_profiles"("organization_id");
ALTER TABLE "partner_profiles"
  ADD CONSTRAINT "partner_profiles_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "partner_badge_assignments" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "badge_code" VARCHAR(64) NOT NULL,
  "assigned_by" VARCHAR(32) NOT NULL,
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "partner_badge_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partner_badge_assignments_organization_id_badge_code_key" ON "partner_badge_assignments"("organization_id", "badge_code");
CREATE INDEX "partner_badge_assignments_organization_id_idx" ON "partner_badge_assignments"("organization_id");
ALTER TABLE "partner_badge_assignments"
  ADD CONSTRAINT "partner_badge_assignments_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "organization_entitlements" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "feature_key" VARCHAR(64) NOT NULL,
  "granted" BOOLEAN NOT NULL,
  "source" VARCHAR(32) NOT NULL DEFAULT 'override',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "organization_entitlements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organization_entitlements_organization_id_feature_key_key" ON "organization_entitlements"("organization_id", "feature_key");
CREATE INDEX "organization_entitlements_organization_id_idx" ON "organization_entitlements"("organization_id");
ALTER TABLE "organization_entitlements"
  ADD CONSTRAINT "organization_entitlements_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rollback:
-- DROP TABLE IF EXISTS "organization_entitlements";
-- DROP TABLE IF EXISTS "partner_badge_assignments";
-- DROP TABLE IF EXISTS "partner_profiles";
-- DROP TABLE IF EXISTS "organization_members";
-- DROP TABLE IF EXISTS "organization_branches";
-- DROP TABLE IF EXISTS "organizations";
-- DROP TYPE IF EXISTS "PartnerVerificationStatus";
-- DROP TYPE IF EXISTS "OrganizationMemberStatus";
-- DROP TYPE IF EXISTS "OrganizationMemberRole";
-- DROP TYPE IF EXISTS "OrganizationStatus";
-- DROP TYPE IF EXISTS "OrganizationType";
