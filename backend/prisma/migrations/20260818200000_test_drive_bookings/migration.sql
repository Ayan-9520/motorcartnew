-- Phase 5B Test Drive bookings (additive).
-- Does not drop, rename, or alter existing tables.
-- Phase 5C PIN routing is not included.

CREATE TYPE "TestDriveStatus" AS ENUM (
    'requested',
    'confirmed',
    'rescheduled',
    'completed',
    'cancelled',
    'rejected',
    'no_show'
);

CREATE TABLE "test_drive_bookings" (
    "id" TEXT NOT NULL,
    "customer_user_id" TEXT NOT NULL,
    "dealer_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "branch_id" TEXT,
    "vehicle_id" TEXT,
    "inventory_id" TEXT,
    "quotation_id" TEXT,
    "lead_id" TEXT,
    "requested_start_at" TIMESTAMP(3) NOT NULL,
    "requested_end_at" TIMESTAMP(3) NOT NULL,
    "confirmed_start_at" TIMESTAMP(3),
    "confirmed_end_at" TIMESTAMP(3),
    "status" "TestDriveStatus" NOT NULL DEFAULT 'requested',
    "customer_notes" TEXT,
    "dealer_notes" TEXT,
    "cancellation_reason" TEXT,
    "rejection_reason" TEXT,
    "completed_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_drive_bookings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "test_drive_bookings_dealer_id_status_idx" ON "test_drive_bookings"("dealer_id", "status");
CREATE INDEX "test_drive_bookings_customer_user_id_created_at_idx" ON "test_drive_bookings"("customer_user_id", "created_at");
CREATE INDEX "test_drive_bookings_organization_id_idx" ON "test_drive_bookings"("organization_id");
CREATE INDEX "test_drive_bookings_vehicle_id_idx" ON "test_drive_bookings"("vehicle_id");
CREATE INDEX "test_drive_bookings_inventory_id_idx" ON "test_drive_bookings"("inventory_id");
CREATE INDEX "test_drive_bookings_quotation_id_idx" ON "test_drive_bookings"("quotation_id");
CREATE INDEX "test_drive_bookings_lead_id_idx" ON "test_drive_bookings"("lead_id");

ALTER TABLE "test_drive_bookings" ADD CONSTRAINT "test_drive_bookings_customer_user_id_fkey" FOREIGN KEY ("customer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "test_drive_bookings" ADD CONSTRAINT "test_drive_bookings_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "test_drive_bookings" ADD CONSTRAINT "test_drive_bookings_dealer_id_fkey" FOREIGN KEY ("dealer_id") REFERENCES "dealers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "test_drive_bookings" ADD CONSTRAINT "test_drive_bookings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "test_drive_bookings" ADD CONSTRAINT "test_drive_bookings_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "organization_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "test_drive_bookings" ADD CONSTRAINT "test_drive_bookings_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "test_drive_bookings" ADD CONSTRAINT "test_drive_bookings_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "new_car_inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "test_drive_bookings" ADD CONSTRAINT "test_drive_bookings_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "test_drive_bookings" ADD CONSTRAINT "test_drive_bookings_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
