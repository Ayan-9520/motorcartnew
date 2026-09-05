-- Batch 12: additive indexes for public search / stock list paths. No table rewrites.
CREATE INDEX IF NOT EXISTS "vehicles_deleted_at_status_idx" ON "vehicles"("deleted_at", "status");
CREATE INDEX IF NOT EXISTS "part_products_status_deleted_at_idx" ON "part_products"("status", "deleted_at");
CREATE INDEX IF NOT EXISTS "new_car_inventory_stock_status_stock_idx" ON "new_car_inventory"("stock_status", "stock");
