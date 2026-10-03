-- Claim intimation desk
CREATE TABLE IF NOT EXISTS "insurance_claim_requests" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "application_id" TEXT,
  "insurer_name" TEXT NOT NULL,
  "policy_number" TEXT NOT NULL,
  "vehicle_reg" TEXT NOT NULL,
  "vehicle_type" TEXT NOT NULL DEFAULT 'car',
  "incident_type" TEXT NOT NULL,
  "incident_at" TIMESTAMP(3) NOT NULL,
  "location" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "claim_mode" TEXT NOT NULL DEFAULT 'cashless',
  "garage" TEXT,
  "fir_number" TEXT,
  "contact_phone" TEXT NOT NULL,
  "documents" JSONB NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'intimated',
  "claim_number" TEXT,
  "survey_at" TIMESTAMP(3),
  "approved_amount" DECIMAL(12,2),
  "notes" JSONB NOT NULL DEFAULT '[]',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "insurance_claim_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "insurance_claim_requests_user_id_idx" ON "insurance_claim_requests"("user_id");
CREATE INDEX IF NOT EXISTS "insurance_claim_requests_status_idx" ON "insurance_claim_requests"("status");

-- Insurer catalogue (public disclosures FY 2024-25). Existing slugs are left untouched.
INSERT INTO "insurance_partners" ("id", "name", "slug", "logo_url", "is_active", "metadata", "created_at")
VALUES
  (gen_random_uuid()::text, 'ACKO General Insurance', 'acko', NULL, true, '{"shortName":"ACKO","claimSettlementRatio":99.98,"cashlessGarages":4000,"planTypes":["comprehensive","third_party","own_damage"],"claimHelpline":"1800 266 2256"}'::jsonb, NOW()),
  (gen_random_uuid()::text, 'HDFC ERGO General Insurance', 'hdfc-ergo', NULL, true, '{"shortName":"HDFC ERGO","claimSettlementRatio":98.85,"cashlessGarages":13000,"planTypes":["comprehensive","third_party","own_damage"],"claimHelpline":"022 6234 6234"}'::jsonb, NOW()),
  (gen_random_uuid()::text, 'ICICI Lombard General Insurance', 'icici-lombard', NULL, true, '{"shortName":"ICICI Lombard","claimSettlementRatio":98.45,"cashlessGarages":7100,"planTypes":["comprehensive","third_party","own_damage"],"claimHelpline":"1800 2666"}'::jsonb, NOW()),
  (gen_random_uuid()::text, 'Bajaj General Insurance', 'bajaj-general', NULL, true, '{"shortName":"Bajaj General","claimSettlementRatio":98.0,"cashlessGarages":7200,"planTypes":["comprehensive","third_party","own_damage"],"claimHelpline":"1800 209 5858"}'::jsonb, NOW()),
  (gen_random_uuid()::text, 'SBI General Insurance', 'sbi-general', NULL, true, '{"shortName":"SBI General","claimSettlementRatio":98.0,"cashlessGarages":16000,"planTypes":["comprehensive","third_party","own_damage"],"claimHelpline":"1800 22 1111"}'::jsonb, NOW()),
  (gen_random_uuid()::text, 'Go Digit General Insurance', 'go-digit', NULL, true, '{"shortName":"Digit","claimSettlementRatio":96.0,"cashlessGarages":10000,"planTypes":["comprehensive","third_party","own_damage"],"claimHelpline":"1800 258 5956"}'::jsonb, NOW()),
  (gen_random_uuid()::text, 'Tata AIG General Insurance', 'tata-aig', NULL, true, '{"shortName":"Tata AIG","claimSettlementRatio":95.0,"cashlessGarages":5700,"planTypes":["comprehensive","third_party","own_damage"],"claimHelpline":"1800 266 7780"}'::jsonb, NOW()),
  (gen_random_uuid()::text, 'Royal Sundaram General Insurance', 'royal-sundaram', NULL, true, '{"shortName":"Royal Sundaram","claimSettlementRatio":93.0,"cashlessGarages":3300,"planTypes":["comprehensive","third_party","own_damage"],"claimHelpline":"1860 425 0000"}'::jsonb, NOW()),
  (gen_random_uuid()::text, 'The New India Assurance', 'new-india', NULL, true, '{"shortName":"New India","claimSettlementRatio":91.75,"cashlessGarages":1100,"planTypes":["comprehensive","third_party","own_damage"],"claimHelpline":"1800 209 1415"}'::jsonb, NOW())
ON CONFLICT ("slug") DO NOTHING;
