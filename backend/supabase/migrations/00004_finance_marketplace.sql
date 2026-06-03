-- Finance marketplace: extended applications, bank rankings, DSA/lender policies, documents bucket

ALTER TABLE banks ADD COLUMN IF NOT EXISTS ranking_score INT NOT NULL DEFAULT 50;
ALTER TABLE banks ADD COLUMN IF NOT EXISTS min_cibil INT NOT NULL DEFAULT 650;
ALTER TABLE banks ADD COLUMN IF NOT EXISTS short_code TEXT;

ALTER TABLE finance_applications ADD COLUMN IF NOT EXISTS application_type TEXT NOT NULL DEFAULT 'new_loan';
ALTER TABLE finance_applications ADD COLUMN IF NOT EXISTS cibil_score INT;
ALTER TABLE finance_applications ADD COLUMN IF NOT EXISTS approval_probability INT;
ALTER TABLE finance_applications ADD COLUMN IF NOT EXISTS monthly_income BIGINT;
ALTER TABLE finance_applications ADD COLUMN IF NOT EXISTS employment_type TEXT;
ALTER TABLE finance_applications ADD COLUMN IF NOT EXISTS refinance_application_id UUID REFERENCES finance_applications(id);
ALTER TABLE finance_applications ADD COLUMN IF NOT EXISTS applicant_metadata JSONB NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_finance_bank ON finance_applications(bank_id);
CREATE INDEX IF NOT EXISTS idx_banks_ranking ON banks(ranking_score DESC);

-- DSA can read/update assigned applications
DROP POLICY IF EXISTS finance_dsa ON finance_applications;
CREATE POLICY finance_dsa ON finance_applications FOR SELECT USING (
  dsa_agent_id IN (SELECT id FROM dsa_agents WHERE user_id = auth.uid())
  OR user_id = auth.uid()
  OR public.is_admin()
);

DROP POLICY IF EXISTS finance_dsa_update ON finance_applications;
CREATE POLICY finance_dsa_update ON finance_applications FOR UPDATE USING (
  dsa_agent_id IN (SELECT id FROM dsa_agents WHERE user_id = auth.uid())
  OR public.is_admin()
);

-- Lender (bank_nbfc) read apps for their bank via user metadata bank_slug
DROP POLICY IF EXISTS finance_lender_read ON finance_applications;
CREATE POLICY finance_lender_read ON finance_applications FOR SELECT USING (
  public.is_admin()
  OR user_id = auth.uid()
  OR bank_id IN (
    SELECT b.id FROM banks b
    JOIN users u ON u.id = auth.uid()
    WHERE u.role = 'bank_nbfc'
      AND (u.metadata->>'bank_slug' = b.slug OR u.metadata->>'bank_id' = b.id::text)
  )
);

DROP POLICY IF EXISTS finance_lender_update ON finance_applications;
CREATE POLICY finance_lender_update ON finance_applications FOR UPDATE USING (
  public.is_admin()
  OR bank_id IN (
    SELECT b.id FROM banks b
    JOIN users u ON u.id = auth.uid()
    WHERE u.role = 'bank_nbfc'
      AND (u.metadata->>'bank_slug' = b.slug OR u.metadata->>'bank_id' = b.id::text)
  )
);

-- Storage: finance documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('finance-documents', 'finance-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS finance_docs_own ON storage.objects;
CREATE POLICY finance_docs_own ON storage.objects FOR ALL
USING (bucket_id = 'finance-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Seed / update all partner lenders
INSERT INTO banks (name, slug, short_code, bank_type, interest_rate_min, interest_rate_max, max_loan_amount, max_tenure_months, processing_fee, features, is_featured, ranking_score, min_cibil)
VALUES
  ('State Bank of India', 'sbi', 'SBI', 'bank', 8.50, 12.00, 5000000, 84, '0.25% of loan', ARRAY['Largest PSU bank','Lowest rates','Govt schemes'], true, 95, 700),
  ('Bank of Baroda', 'bob', 'BOB', 'bank', 8.65, 12.25, 4500000, 84, '0.35%', ARRAY['Flexible tenure','Quick approval'], true, 88, 680),
  ('Bank of India', 'boi', 'BOI', 'bank', 8.70, 12.40, 4000000, 84, '0.40%', ARRAY['Used car loans','Balance transfer'], false, 82, 670),
  ('Punjab National Bank', 'pnb', 'PNB', 'bank', 8.55, 12.15, 4200000, 84, '0.30%', ARRAY['EV loan specials'], true, 86, 680),
  ('UCO Bank', 'uco', 'UCO', 'bank', 8.80, 12.50, 3500000, 72, '0.45%', ARRAY['Affordable EMIs'], false, 75, 650),
  ('Indian Overseas Bank', 'iob', 'IOB', 'bank', 8.75, 12.45, 3800000, 72, '0.42%', ARRAY['Rural schemes'], false, 74, 650),
  ('HDFC Bank', 'hdfc-bank', 'HDFC', 'bank', 8.75, 12.50, 7500000, 84, '0.5% of loan', ARRAY['Instant approval','Zero foreclosure'], true, 98, 720),
  ('ICICI Bank', 'icici-bank', 'ICICI', 'bank', 8.99, 13.00, 7500000, 84, '₹2,999 flat', ARRAY['Pre-approved offers','Doorstep KYC'], true, 96, 710),
  ('Axis Bank', 'axis-bank', 'AXIS', 'bank', 9.25, 13.50, 5000000, 72, '1% of loan', ARRAY['Quick disbursal','Top-up loans'], true, 90, 700),
  ('Kotak Mahindra Bank', 'kotak', 'KOTAK', 'bank', 9.00, 12.75, 5000000, 60, '₹3,500 flat', ARRAY['Digital KYC','Same-day approval'], true, 92, 705),
  ('AU Small Finance Bank', 'au-bank', 'AU', 'bank', 9.50, 14.00, 3000000, 60, '1.2%', ARRAY['MSME focus','Fast processing'], false, 78, 640),
  ('Cholamandalam Investment', 'cholamandalam', 'CHOLA', 'nbfc', 9.75, 15.00, 4000000, 60, '1.5%', ARRAY['Used car specialist','Minimal docs'], true, 85, 620),
  ('Mahindra Finance', 'mahindra-finance', 'M&M', 'nbfc', 9.25, 14.50, 4500000, 72, '1%', ARRAY['Tractor & CV loans','Rural network'], true, 87, 630),
  ('Vastu Housing Finance', 'vastu', 'VASTU', 'nbfc', 9.99, 15.50, 2500000, 60, '1.8%', ARRAY['Affordable housing','Co-applicant allowed'], false, 70, 600)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  short_code = EXCLUDED.short_code,
  interest_rate_min = EXCLUDED.interest_rate_min,
  interest_rate_max = EXCLUDED.interest_rate_max,
  max_loan_amount = EXCLUDED.max_loan_amount,
  ranking_score = EXCLUDED.ranking_score,
  min_cibil = EXCLUDED.min_cibil,
  features = EXCLUDED.features;

-- Auto-assign DSA (round-robin among active agents)
CREATE OR REPLACE FUNCTION public.assign_dsa_to_application(p_application_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dsa_id UUID;
BEGIN
  SELECT id INTO v_dsa_id
  FROM dsa_agents
  WHERE is_active = true
  ORDER BY total_disbursed ASC, random()
  LIMIT 1;

  IF v_dsa_id IS NOT NULL THEN
    UPDATE finance_applications
    SET dsa_agent_id = v_dsa_id, updated_at = NOW()
    WHERE id = p_application_id AND dsa_agent_id IS NULL;
  END IF;

  RETURN v_dsa_id;
END;
$$;

-- Submit loan with AI scores
CREATE OR REPLACE FUNCTION public.submit_finance_application(
  p_bank_id UUID,
  p_loan_amount BIGINT,
  p_tenure_months INT,
  p_interest_rate DECIMAL,
  p_monthly_income BIGINT DEFAULT NULL,
  p_cibil_score INT DEFAULT NULL,
  p_employment_type TEXT DEFAULT 'salaried',
  p_application_type TEXT DEFAULT 'new_loan',
  p_vehicle_id UUID DEFAULT NULL,
  p_applicant_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_emi BIGINT;
  v_ai_score INT;
  v_prob INT;
  v_app_id UUID;
  v_dsa UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Authentication required');
  END IF;

  IF p_loan_amount < 50000 OR p_tenure_months < 6 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid loan parameters');
  END IF;

  v_emi := ROUND(
    (p_loan_amount::numeric * (p_interest_rate/1200) * POWER(1 + p_interest_rate/1200, p_tenure_months))
    / (POWER(1 + p_interest_rate/1200, p_tenure_months) - 1)
  )::BIGINT;

  v_ai_score := LEAST(100, GREATEST(0,
    COALESCE(p_cibil_score, 700) / 10
    + CASE WHEN p_monthly_income >= 100000 THEN 20 WHEN p_monthly_income >= 50000 THEN 12 ELSE 5 END
    + CASE WHEN p_loan_amount <= 2000000 THEN 15 ELSE 5 END
  ));

  v_prob := LEAST(98, GREATEST(15, v_ai_score - 5 + (random() * 10)::int));

  INSERT INTO finance_applications (
    user_id, bank_id, vehicle_id, loan_amount, tenure_months, interest_rate, emi_amount,
    status, ai_eligibility_score, approval_probability, monthly_income, cibil_score,
    employment_type, application_type, applicant_metadata
  ) VALUES (
    v_user_id, p_bank_id, p_vehicle_id, p_loan_amount, p_tenure_months, p_interest_rate, v_emi,
    'submitted', v_ai_score, v_prob, p_monthly_income, p_cibil_score,
    p_employment_type, p_application_type, p_applicant_metadata
  )
  RETURNING id INTO v_app_id;

  v_dsa := public.assign_dsa_to_application(v_app_id);

  RETURN jsonb_build_object(
    'ok', true,
    'application_id', v_app_id,
    'emi_amount', v_emi,
    'ai_eligibility_score', v_ai_score,
    'approval_probability', v_prob,
    'dsa_agent_id', v_dsa
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_finance_application TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_dsa_to_application TO authenticated;
