-- Phase 2A: nullable catalog linkage on marketplace listings (additive only)

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN "catalog_variant_id" TEXT;

-- AlterTable
ALTER TABLE "new_car_inventory" ADD COLUMN "catalog_variant_id" TEXT;

-- CreateIndex
CREATE INDEX "vehicles_catalog_variant_id_idx" ON "vehicles"("catalog_variant_id");

-- CreateIndex
CREATE INDEX "new_car_inventory_catalog_variant_id_idx" ON "new_car_inventory"("catalog_variant_id");

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_catalog_variant_id_fkey" FOREIGN KEY ("catalog_variant_id") REFERENCES "catalog_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "new_car_inventory" ADD CONSTRAINT "new_car_inventory_catalog_variant_id_fkey" FOREIGN KEY ("catalog_variant_id") REFERENCES "catalog_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
