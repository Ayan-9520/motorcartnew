-- Motor insurance: quotes, applications, partner seed

CREATE TABLE IF NOT EXISTS public.insurance_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  claim_settlement_ratio DECIMAL(5,2),
  plan_types TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.insurance_partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS insurance_public_read ON public.insurance_partners;
CREATE POLICY insurance_public_read ON public.insurance_partners
  FOR SELECT USING (is_active = true);

DO $$ BEGIN
  CREATE TYPE public.insurance_vehicle_type AS ENUM ('car', 'bike');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.insurance_plan_type AS ENUM ('third_party', 'comprehensive', 'zero_dep', 'own_damage');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.insurance_app_status AS ENUM ('draft', 'quoted', 'submitted', 'under_review', 'issued', 'rejected', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.insurance_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  vehicle_type public.insurance_vehicle_type NOT NULL,
  vehicle_year INT NOT NULL,
  vehicle_make TEXT NOT NULL,
  vehicle_model TEXT NOT NULL,
  registration_city TEXT NOT NULL,
  fuel_type TEXT DEFAULT 'petrol',
  idv_amount BIGINT NOT NULL,
  ncb_percent INT NOT NULL DEFAULT 0 CHECK (ncb_percent >= 0 AND ncb_percent <= 50),
  plan_type public.insurance_plan_type NOT NULL,
  partner_id UUID REFERENCES public.insurance_partners(id) ON DELETE SET NULL,
  partner_name TEXT,
  annual_premium BIGINT NOT NULL,
  monthly_premium BIGINT,
  addons JSONB NOT NULL DEFAULT '[]',
  premium_breakdown JSONB NOT NULL DEFAULT '{}',
  claim_settlement_ratio NUMERIC(5,2),
  rank_score INT DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.insurance_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES public.insurance_quotes(id) ON DELETE SET NULL,
  partner_id UUID REFERENCES public.insurance_partners(id) ON DELETE SET NULL,
  partner_name TEXT,
  vehicle_type public.insurance_vehicle_type NOT NULL,
  vehicle_year INT NOT NULL,
  vehicle_make TEXT NOT NULL,
  vehicle_model TEXT NOT NULL,
  registration_number TEXT,
  registration_city TEXT NOT NULL,
  plan_type public.insurance_plan_type NOT NULL,
  idv_amount BIGINT NOT NULL,
  annual_premium BIGINT NOT NULL,
  ncb_percent INT NOT NULL DEFAULT 0,
  status public.insurance_app_status NOT NULL DEFAULT 'submitted',
  policy_number TEXT,
  policy_start DATE,
  policy_end DATE,
  applicant_name TEXT,
  applicant_phone TEXT,
  applicant_email TEXT,
  addons JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insurance_quotes_user ON public.insurance_quotes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_insurance_apps_user ON public.insurance_applications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_insurance_apps_status ON public.insurance_applications(status);

ALTER TABLE public.insurance_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS insurance_quotes_own ON public.insurance_quotes;
CREATE POLICY insurance_quotes_own ON public.insurance_quotes
  FOR ALL USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS insurance_apps_own ON public.insurance_applications;
CREATE POLICY insurance_apps_own ON public.insurance_applications
  FOR ALL USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS insurance_apps_insert ON public.insurance_applications;
CREATE POLICY insurance_apps_insert ON public.insurance_applications
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Seed partners (idempotent)
INSERT INTO public.insurance_partners (name, slug, logo_url, claim_settlement_ratio, plan_types, is_active)
VALUES
  ('HDFC ERGO', 'hdfc-ergo', '/partners/banks/hdfcbank.svg', 96.5, ARRAY['third_party','comprehensive','zero_dep','own_damage'], true),
  ('ICICI Lombard', 'icici-lombard', '/partners/banks/icicibank.svg', 95.8, ARRAY['third_party','comprehensive','zero_dep'], true),
  ('Bajaj Allianz', 'bajaj-allianz', '/partners/banks/bajaj.svg', 94.2, ARRAY['third_party','comprehensive','zero_dep','own_damage'], true),
  ('Tata AIG', 'tata-aig', '/partners/banks/tata-capital.svg', 93.9, ARRAY['comprehensive','zero_dep','own_damage'], true),
  ('Digit Insurance', 'digit', '/partners/banks/au.svg', 96.1, ARRAY['third_party','comprehensive','zero_dep'], true),
  ('ACKO', 'acko', '/partners/banks/kotak.svg', 97.2, ARRAY['third_party','comprehensive','zero_dep'], true)
ON CONFLICT (slug) DO UPDATE SET
  claim_settlement_ratio = EXCLUDED.claim_settlement_ratio,
  plan_types = EXCLUDED.plan_types,
  is_active = EXCLUDED.is_active;

CREATE OR REPLACE FUNCTION public.submit_insurance_application(
  p_partner_id UUID,
  p_vehicle_type public.insurance_vehicle_type,
  p_vehicle_year INT,
  p_vehicle_make TEXT,
  p_vehicle_model TEXT,
  p_registration_city TEXT,
  p_plan_type public.insurance_plan_type,
  p_idv_amount BIGINT,
  p_annual_premium BIGINT,
  p_ncb_percent INT DEFAULT 0,
  p_quote_id UUID DEFAULT NULL,
  p_registration_number TEXT DEFAULT NULL,
  p_applicant_name TEXT DEFAULT NULL,
  p_applicant_phone TEXT DEFAULT NULL,
  p_applicant_email TEXT DEFAULT NULL,
  p_addons JSONB DEFAULT '[]'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_partner RECORD;
  v_app_id UUID;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT id, name INTO v_partner FROM insurance_partners WHERE id = p_partner_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_partner');
  END IF;

  INSERT INTO insurance_applications (
    user_id, quote_id, partner_id, partner_name, vehicle_type, vehicle_year, vehicle_make, vehicle_model,
    registration_number, registration_city, plan_type, idv_amount, annual_premium, ncb_percent,
    applicant_name, applicant_phone, applicant_email, addons, status
  ) VALUES (
    v_user, p_quote_id, p_partner_id, v_partner.name, p_vehicle_type, p_vehicle_year, p_vehicle_make, p_vehicle_model,
    p_registration_number, p_registration_city, p_plan_type, p_idv_amount, p_annual_premium, p_ncb_percent,
    p_applicant_name, p_applicant_phone, p_applicant_email, COALESCE(p_addons, '[]'::jsonb), 'submitted'
  )
  RETURNING id INTO v_app_id;

  RETURN jsonb_build_object('ok', true, 'application_id', v_app_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_insurance_application TO authenticated;
