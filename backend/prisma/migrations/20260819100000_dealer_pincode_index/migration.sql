-- Phase 5C — exact PIN stock discovery (additive index only).
-- Reuses dealers.pincode. Does not add inventory-level pincode.

CREATE INDEX "dealers_pincode_idx" ON "dealers"("pincode");
