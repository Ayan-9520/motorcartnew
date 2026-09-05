-- Phase 5A Quotation engine (additive).
-- Does not drop, rename, or alter existing tables.

CREATE TYPE "QuotationStatus" AS ENUM ('draft', 'issued', 'accepted', 'expired', 'cancelled');

CREATE TABLE "quotations" (
    "id" TEXT NOT NULL,
    "quotation_number" TEXT NOT NULL,
    "status" "QuotationStatus" NOT NULL DEFAULT 'draft',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "pincode" VARCHAR(16),
    "customer_user_id" TEXT NOT NULL,
    "dealer_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "lead_id" TEXT,
    "vehicle_id" TEXT,
    "inventory_id" TEXT,
    "ex_showroom_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "rto_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "insurance_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "accessories_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "finance_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "exchange_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "other_charges" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "validity_start" TIMESTAMP(3),
    "validity_end" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "issued_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "quotations_quotation_number_key" ON "quotations"("quotation_number");
CREATE INDEX "quotations_dealer_id_status_idx" ON "quotations"("dealer_id", "status");
CREATE INDEX "quotations_customer_user_id_created_at_idx" ON "quotations"("customer_user_id", "created_at");
CREATE INDEX "quotations_organization_id_idx" ON "quotations"("organization_id");
CREATE INDEX "quotations_lead_id_idx" ON "quotations"("lead_id");
CREATE INDEX "quotations_inventory_id_idx" ON "quotations"("inventory_id");

ALTER TABLE "quotations" ADD CONSTRAINT "quotations_customer_user_id_fkey" FOREIGN KEY ("customer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_dealer_id_fkey" FOREIGN KEY ("dealer_id") REFERENCES "dealers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "new_car_inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
