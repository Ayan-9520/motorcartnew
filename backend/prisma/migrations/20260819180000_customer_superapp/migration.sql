-- Batch 9 — Customer Super-App, MotorCart One, saved searches, reminders, media trust, sell/valuation.
-- Additive only.

ALTER TYPE "OrganizationType" ADD VALUE IF NOT EXISTS 'VALUATION_PARTNER';

ALTER TABLE "scheduled_reminders" ADD COLUMN "status" VARCHAR(16) NOT NULL DEFAULT 'SCHEDULED';
ALTER TABLE "scheduled_reminders" ADD COLUMN "source_type" VARCHAR(40);
ALTER TABLE "scheduled_reminders" ADD COLUMN "source_id" TEXT;
ALTER TABLE "scheduled_reminders" ADD COLUMN "completed_at" TIMESTAMP(3);
ALTER TABLE "scheduled_reminders" ADD COLUMN "dismissed_at" TIMESTAMP(3);
ALTER TABLE "scheduled_reminders" ADD COLUMN "snoozed_until" TIMESTAMP(3);
CREATE INDEX "scheduled_reminders_user_id_status_due_at_idx" ON "scheduled_reminders"("user_id", "status", "due_at");
CREATE INDEX "scheduled_reminders_user_id_source_type_source_id_idx" ON "scheduled_reminders"("user_id", "source_type", "source_id");

CREATE TABLE "motorcart_identities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "public_id" VARCHAR(16) NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "motorcart_identities_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "motorcart_identities_user_id_key" ON "motorcart_identities"("user_id");
CREATE UNIQUE INDEX "motorcart_identities_public_id_key" ON "motorcart_identities"("public_id");
ALTER TABLE "motorcart_identities" ADD CONSTRAINT "motorcart_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "motorcart_one_tokens" (
    "id" TEXT NOT NULL,
    "identity_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "motorcart_one_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "motorcart_one_tokens_token_hash_key" ON "motorcart_one_tokens"("token_hash");
CREATE INDEX "motorcart_one_tokens_identity_id_idx" ON "motorcart_one_tokens"("identity_id");
ALTER TABLE "motorcart_one_tokens" ADD CONSTRAINT "motorcart_one_tokens_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "motorcart_identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "saved_searches" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "criteria" JSONB NOT NULL,
    "notify_on_match" BOOLEAN NOT NULL DEFAULT false,
    "last_run_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "saved_searches_user_id_idx" ON "saved_searches"("user_id");
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "saved_search_matches" (
    "id" TEXT NOT NULL,
    "saved_search_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "saved_search_matches_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "saved_search_matches_saved_search_id_vehicle_id_key" ON "saved_search_matches"("saved_search_id", "vehicle_id");
ALTER TABLE "saved_search_matches" ADD CONSTRAINT "saved_search_matches_saved_search_id_fkey" FOREIGN KEY ("saved_search_id") REFERENCES "saved_searches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "vehicle_sale_requests" (
    "id" TEXT NOT NULL,
    "customer_user_id" TEXT NOT NULL,
    "customer_vehicle_id" TEXT,
    "vehicle_id" TEXT,
    "lead_id" TEXT,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "variant" TEXT,
    "year" INTEGER NOT NULL,
    "kms_driven" INTEGER NOT NULL,
    "owners" INTEGER NOT NULL DEFAULT 1,
    "fuel_type" TEXT NOT NULL,
    "transmission" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "expected_price" DECIMAL(14,2),
    "condition_notes" TEXT,
    "status" VARCHAR(24) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "vehicle_sale_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "vehicle_sale_requests_customer_user_id_status_idx" ON "vehicle_sale_requests"("customer_user_id", "status");
CREATE INDEX "vehicle_sale_requests_status_idx" ON "vehicle_sale_requests"("status");
ALTER TABLE "vehicle_sale_requests" ADD CONSTRAINT "vehicle_sale_requests_customer_user_id_fkey" FOREIGN KEY ("customer_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "vehicle_media_assets" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT,
    "sale_request_id" TEXT,
    "uploader_user_id" TEXT NOT NULL,
    "dealer_id" TEXT,
    "organization_id" TEXT,
    "media_type" VARCHAR(16) NOT NULL,
    "original_path" TEXT NOT NULL,
    "processed_path" TEXT,
    "original_url" TEXT NOT NULL,
    "processed_url" TEXT,
    "mime_type" VARCHAR(80) NOT NULL,
    "size" INTEGER NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "watermark_status" VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    "plate_privacy_status" VARCHAR(16) NOT NULL DEFAULT 'NOT_REQUIRED',
    "authenticity_status" VARCHAR(16) NOT NULL DEFAULT 'UPLOADED',
    "processing_state" VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    "processed_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vehicle_media_assets_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "vehicle_media_assets_vehicle_id_idx" ON "vehicle_media_assets"("vehicle_id");
CREATE INDEX "vehicle_media_assets_sale_request_id_idx" ON "vehicle_media_assets"("sale_request_id");
CREATE INDEX "vehicle_media_assets_uploader_user_id_idx" ON "vehicle_media_assets"("uploader_user_id");
ALTER TABLE "vehicle_media_assets" ADD CONSTRAINT "vehicle_media_assets_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vehicle_media_assets" ADD CONSTRAINT "vehicle_media_assets_sale_request_id_fkey" FOREIGN KEY ("sale_request_id") REFERENCES "vehicle_sale_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vehicle_media_assets" ADD CONSTRAINT "vehicle_media_assets_uploader_user_id_fkey" FOREIGN KEY ("uploader_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vehicle_media_assets" ADD CONSTRAINT "vehicle_media_assets_dealer_id_fkey" FOREIGN KEY ("dealer_id") REFERENCES "dealers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "vehicle_valuations" (
    "id" TEXT NOT NULL,
    "sale_request_id" TEXT NOT NULL,
    "valuation_partner_org_id" TEXT NOT NULL,
    "amount_min" DECIMAL(14,2) NOT NULL,
    "amount_max" DECIMAL(14,2) NOT NULL,
    "condition" VARCHAR(160),
    "valid_until" TIMESTAMP(3),
    "notes" TEXT,
    "status" VARCHAR(16) NOT NULL DEFAULT 'SUBMITTED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vehicle_valuations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "vehicle_valuations_sale_request_id_idx" ON "vehicle_valuations"("sale_request_id");
CREATE INDEX "vehicle_valuations_valuation_partner_org_id_idx" ON "vehicle_valuations"("valuation_partner_org_id");
ALTER TABLE "vehicle_valuations" ADD CONSTRAINT "vehicle_valuations_sale_request_id_fkey" FOREIGN KEY ("sale_request_id") REFERENCES "vehicle_sale_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vehicle_valuations" ADD CONSTRAINT "vehicle_valuations_valuation_partner_org_id_fkey" FOREIGN KEY ("valuation_partner_org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "vehicle_purchase_offers" (
    "id" TEXT NOT NULL,
    "sale_request_id" TEXT NOT NULL,
    "dealer_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "valid_until" TIMESTAMP(3),
    "notes" TEXT,
    "status" VARCHAR(16) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "vehicle_purchase_offers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "vehicle_purchase_offers_sale_request_id_status_idx" ON "vehicle_purchase_offers"("sale_request_id", "status");
CREATE INDEX "vehicle_purchase_offers_dealer_id_idx" ON "vehicle_purchase_offers"("dealer_id");
ALTER TABLE "vehicle_purchase_offers" ADD CONSTRAINT "vehicle_purchase_offers_sale_request_id_fkey" FOREIGN KEY ("sale_request_id") REFERENCES "vehicle_sale_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vehicle_purchase_offers" ADD CONSTRAINT "vehicle_purchase_offers_dealer_id_fkey" FOREIGN KEY ("dealer_id") REFERENCES "dealers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
