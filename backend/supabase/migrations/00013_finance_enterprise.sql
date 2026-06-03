-- =============================================================================
-- MOTORCART — Fintech finance ecosystem (pipeline, leads, commissions, integrations)
-- =============================================================================

ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'finance_manager';

-- Lead distribution (before / without full application)
CREATE TABLE IF NOT EXISTS public.finance_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'marketplace',
  product_type TEXT NOT NULL DEFAULT 'vehicle_loan',
  loan_amount BIGINT,
  monthly_income BIGINT,
  cibil_score INT,
  city TEXT,
  phone TEXT,
  email TEXT,
  assigned_dsa_id UUID REFERENCES public.dsa_agents(id) ON DELETE SET NULL,
  assigned_bank_id UUID REFERENCES public.banks(id) ON DELETE SET NULL,
  application_id UUID REFERENCES public.finance_applications(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_leads_status ON public.finance_leads(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_leads_dsa ON public.finance_leads(assigned_dsa_id);

-- Status history (approval pipeline audit)
CREATE TABLE IF NOT EXISTS public.finance_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES public.finance_applications(id) ON DELETE CASCADE,
  from_status finance_status,
  to_status finance_status NOT NULL,
  changed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_status_hist_app ON public.finance_status_history(application_id, created_at DESC);

-- Document / KYC verification tracking
CREATE TABLE IF NOT EXISTS public.finance_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES public.finance_applications(id) ON DELETE CASCADE,
  check_type TEXT NOT NULL CHECK (check_type IN ('identity', 'income', 'address', 'bank_statement', 'vehicle_rc', 'cibil', 'other')),
  status doc_status NOT NULL DEFAULT 'pending',
  verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  document_path TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_verifications_app ON public.finance_verifications(application_id);

-- DSA commission ledger
CREATE TABLE IF NOT EXISTS public.finance_commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES public.finance_applications(id) ON DELETE CASCADE,
  dsa_agent_id UUID NOT NULL REFERENCES public.dsa_agents(id) ON DELETE CASCADE,
  loan_amount BIGINT NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  commission_amount BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_commissions_dsa ON public.finance_commissions(dsa_agent_id, created_at DESC);

-- Bank integration configs (webhook / API ready — secrets in vault, not stored here)
CREATE TABLE IF NOT EXISTS public.bank_integration_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE UNIQUE,
  provider TEXT NOT NULL DEFAULT 'rest',
  api_base_url TEXT,
  webhook_url TEXT,
  webhook_secret_ref TEXT,
  sync_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  last_sync_at TIMESTAMPTZ,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helpers
CREATE OR REPLACE FUNCTION public.is_finance_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role::text IN ('finance_manager', 'admin', 'super_admin')
  );
$$;

-- Advance application with audit + commission on disburse
CREATE OR REPLACE FUNCTION public.advance_finance_application(
  p_application_id UUID,
  p_status finance_status,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app RECORD;
  v_dsa RECORD;
  v_commission BIGINT;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Authentication required');
  END IF;

  SELECT * INTO v_app FROM finance_applications WHERE id = p_application_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Application not found');
  END IF;

  INSERT INTO finance_status_history (application_id, from_status, to_status, changed_by, notes)
  VALUES (p_application_id, v_app.status, p_status, v_uid, p_notes);

  UPDATE finance_applications
  SET status = p_status, notes = COALESCE(p_notes, notes), updated_at = NOW()
  WHERE id = p_application_id;

  -- Seed verification checks when entering processing
  IF p_status = 'processing' AND NOT EXISTS (
    SELECT 1 FROM finance_verifications WHERE application_id = p_application_id LIMIT 1
  ) THEN
    INSERT INTO finance_verifications (application_id, check_type, status)
    VALUES
      (p_application_id, 'identity', 'pending'),
      (p_application_id, 'income', 'pending'),
      (p_application_id, 'cibil', 'pending'),
      (p_application_id, 'bank_statement', 'pending');
  END IF;

  -- Commission on disburse
  IF p_status = 'disbursed' AND v_app.dsa_agent_id IS NOT NULL THEN
    SELECT * INTO v_dsa FROM dsa_agents WHERE id = v_app.dsa_agent_id;
    IF FOUND AND v_dsa.commission_rate > 0 THEN
      v_commission := ROUND(v_app.loan_amount * v_dsa.commission_rate / 100)::BIGINT;
      IF NOT EXISTS (SELECT 1 FROM finance_commissions WHERE application_id = p_application_id) THEN
        INSERT INTO finance_commissions (
          application_id, dsa_agent_id, loan_amount, commission_rate, commission_amount, status
        ) VALUES (
          p_application_id, v_app.dsa_agent_id, v_app.loan_amount, v_dsa.commission_rate, v_commission, 'pending'
        );
      END IF;

      UPDATE dsa_agents
      SET total_disbursed = total_disbursed + v_app.loan_amount, updated_at = NOW()
      WHERE id = v_app.dsa_agent_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'status', p_status);
END;
$$;

-- Distribute lead to DSA (+ optional bank)
CREATE OR REPLACE FUNCTION public.distribute_finance_lead(p_lead_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dsa_id UUID;
  v_bank_id UUID;
BEGIN
  IF NOT public.is_finance_manager() AND NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Finance manager access required');
  END IF;

  SELECT id INTO v_dsa_id FROM dsa_agents WHERE is_active = true ORDER BY total_disbursed ASC, random() LIMIT 1;
  SELECT id INTO v_bank_id FROM banks WHERE is_active = true ORDER BY ranking_score DESC LIMIT 1;

  UPDATE finance_leads
  SET assigned_dsa_id = v_dsa_id, assigned_bank_id = v_bank_id, status = 'contacted', updated_at = NOW()
  WHERE id = p_lead_id;

  RETURN jsonb_build_object('ok', true, 'dsa_agent_id', v_dsa_id, 'bank_id', v_bank_id);
END;
$$;

-- Update verification check
CREATE OR REPLACE FUNCTION public.update_finance_verification(
  p_verification_id UUID,
  p_status doc_status,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Authentication required');
  END IF;

  UPDATE finance_verifications
  SET status = p_status, notes = p_notes, verified_by = auth.uid(), updated_at = NOW()
  WHERE id = p_verification_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.advance_finance_application(UUID, finance_status, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.distribute_finance_lead(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_finance_verification(UUID, doc_status, TEXT) TO authenticated;

-- RLS
ALTER TABLE public.finance_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_integration_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS finance_leads_staff ON public.finance_leads;
CREATE POLICY finance_leads_staff ON public.finance_leads FOR ALL USING (
  public.is_admin() OR public.is_finance_manager()
  OR user_id = auth.uid()
  OR assigned_dsa_id IN (SELECT id FROM dsa_agents WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS finance_leads_insert ON public.finance_leads;
CREATE POLICY finance_leads_insert ON public.finance_leads FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS finance_status_hist_read ON public.finance_status_history;
CREATE POLICY finance_status_hist_read ON public.finance_status_history FOR SELECT USING (
  public.is_admin() OR public.is_finance_manager()
  OR EXISTS (SELECT 1 FROM finance_applications fa WHERE fa.id = application_id AND (fa.user_id = auth.uid() OR fa.dsa_agent_id IN (SELECT id FROM dsa_agents WHERE user_id = auth.uid())))
);

DROP POLICY IF EXISTS finance_verifications_staff ON public.finance_verifications;
CREATE POLICY finance_verifications_staff ON public.finance_verifications FOR ALL USING (
  public.is_admin() OR public.is_finance_manager()
  OR EXISTS (
    SELECT 1 FROM finance_applications fa
    WHERE fa.id = application_id
      AND (fa.user_id = auth.uid() OR fa.dsa_agent_id IN (SELECT id FROM dsa_agents WHERE user_id = auth.uid())
        OR fa.bank_id IN (SELECT b.id FROM banks b JOIN users u ON u.id = auth.uid() WHERE u.role = 'bank_nbfc'))
  )
);

DROP POLICY IF EXISTS finance_commissions_read ON public.finance_commissions;
CREATE POLICY finance_commissions_read ON public.finance_commissions FOR SELECT USING (
  public.is_admin() OR public.is_finance_manager()
  OR dsa_agent_id IN (SELECT id FROM dsa_agents WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS bank_integration_read ON public.bank_integration_configs;
CREATE POLICY bank_integration_read ON public.bank_integration_configs FOR SELECT USING (
  public.is_admin() OR public.is_finance_manager()
  OR bank_id IN (
    SELECT b.id FROM banks b JOIN users u ON u.id = auth.uid()
    WHERE u.role = 'bank_nbfc' AND (u.metadata->>'bank_slug' = b.slug OR u.metadata->>'bank_id' = b.id::text)
  )
);

DROP POLICY IF EXISTS bank_integration_manage ON public.bank_integration_configs;
CREATE POLICY bank_integration_manage ON public.bank_integration_configs FOR ALL USING (
  public.is_admin() OR public.is_finance_manager()
);

-- Finance manager read all applications
DROP POLICY IF EXISTS finance_manager_read ON public.finance_applications;
CREATE POLICY finance_manager_read ON public.finance_applications FOR SELECT USING (
  public.is_finance_manager()
);

DROP POLICY IF EXISTS finance_manager_update ON public.finance_applications;
CREATE POLICY finance_manager_update ON public.finance_applications FOR UPDATE USING (
  public.is_finance_manager()
);

-- Realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.finance_applications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.finance_leads;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.finance_commissions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seed integration stubs for top banks
INSERT INTO bank_integration_configs (bank_id, provider, api_base_url, webhook_url, sync_enabled, config)
SELECT id, 'rest', 'https://api.partner.example/v1', NULL, false, '{"version":"1.0","features":["application_submit","status_webhook"]}'::jsonb
FROM banks WHERE slug IN ('hdfc-bank', 'icici-bank', 'sbi', 'axis-bank')
ON CONFLICT (bank_id) DO NOTHING;
