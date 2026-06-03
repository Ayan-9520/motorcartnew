-- Service Partner / Garage ERP
-- Run the ENTIRE file in Supabase SQL Editor (Ctrl+A → Run). Do not run only the last block.

-- =============================================================================
-- 1) Tables (order matters: service_customers_crm before service_loyalty_points)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.service_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_center_id UUID NOT NULL REFERENCES public.service_centers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  manager_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.service_job_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_center_id UUID NOT NULL REFERENCES public.service_centers(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES public.service_branches(id) ON DELETE SET NULL,
  job_no TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INT,
  vin TEXT,
  rc_number TEXT,
  complaints TEXT,
  technician_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  labour_amount BIGINT DEFAULT 0,
  parts_amount BIGINT DEFAULT 0,
  estimated_total BIGINT DEFAULT 0,
  workflow_stage TEXT NOT NULL DEFAULT 'waiting',
  delivery_at TIMESTAMPTZ,
  insurance_ref TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_job_cards_center ON public.service_job_cards(service_center_id);
CREATE INDEX IF NOT EXISTS idx_service_job_cards_booking ON public.service_job_cards(booking_id);

CREATE TABLE IF NOT EXISTS public.service_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_card_id UUID NOT NULL REFERENCES public.service_job_cards(id) ON DELETE CASCADE,
  service_center_id UUID NOT NULL REFERENCES public.service_centers(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  findings JSONB NOT NULL DEFAULT '[]',
  photos JSONB NOT NULL DEFAULT '[]',
  ai_recommendations JSONB NOT NULL DEFAULT '[]',
  estimate_amount BIGINT DEFAULT 0,
  customer_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.service_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_center_id UUID NOT NULL REFERENCES public.service_centers(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  quantity INT NOT NULL DEFAULT 0,
  min_qty INT NOT NULL DEFAULT 5,
  unit_cost BIGINT DEFAULT 0,
  vendor_name TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (service_center_id, sku)
);

CREATE TABLE IF NOT EXISTS public.service_customers_crm (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_center_id UUID NOT NULL REFERENCES public.service_centers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  loyalty_points INT NOT NULL DEFAULT 0,
  insurance_expiry DATE,
  puc_expiry DATE,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.service_pickups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_center_id UUID NOT NULL REFERENCES public.service_centers(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  pickup_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested',
  otp_verified BOOLEAN DEFAULT FALSE,
  eta_minutes INT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.service_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_center_id UUID NOT NULL REFERENCES public.service_centers(id) ON DELETE CASCADE,
  job_card_id UUID REFERENCES public.service_job_cards(id) ON DELETE SET NULL,
  insurer TEXT NOT NULL,
  claim_no TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  estimate_amount BIGINT DEFAULT 0,
  approved_amount BIGINT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.service_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_center_id UUID NOT NULL REFERENCES public.service_centers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  skills JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_staff_center ON public.service_staff(service_center_id);
CREATE INDEX IF NOT EXISTS idx_service_staff_user ON public.service_staff(user_id);

CREATE TABLE IF NOT EXISTS public.service_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_center_id UUID NOT NULL REFERENCES public.service_centers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  severity TEXT DEFAULT 'info',
  href TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.service_ai_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_center_id UUID NOT NULL REFERENCES public.service_centers(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.service_loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_center_id UUID NOT NULL REFERENCES public.service_centers(id) ON DELETE CASCADE,
  customer_crm_id UUID NOT NULL REFERENCES public.service_customers_crm(id) ON DELETE CASCADE,
  points INT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 2) Helper (must run AFTER public.service_staff exists)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.sc_owner_center_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sc.id
  FROM public.service_centers sc
  WHERE sc.owner_id = auth.uid()
  UNION
  SELECT ss.service_center_id
  FROM public.service_staff ss
  WHERE ss.user_id = auth.uid() AND ss.is_active = TRUE;
$$;

GRANT EXECUTE ON FUNCTION public.sc_owner_center_ids() TO authenticated;

-- =============================================================================
-- 3) Table grants (RLS still applies)
-- =============================================================================
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'service_branches', 'service_job_cards', 'service_inspections', 'service_inventory',
    'service_customers_crm', 'service_pickups', 'service_claims', 'service_staff',
    'service_notifications', 'service_ai_logs', 'service_loyalty_points'
  ]
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

-- =============================================================================
-- 4) RLS policies
-- =============================================================================
ALTER TABLE public.service_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_job_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_customers_crm ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_pickups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_loyalty_points ENABLE ROW LEVEL SECURITY;

-- Tables with service_center_id (exclude service_staff — avoids RLS recursion)
DO $$
DECLARE
  t TEXT;
  pol TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'service_branches', 'service_job_cards', 'service_inspections', 'service_inventory',
    'service_customers_crm', 'service_pickups', 'service_claims',
    'service_notifications', 'service_ai_logs', 'service_loyalty_points'
  ]
  LOOP
    pol := t || '_sc';
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL '
      || 'USING (service_center_id IN (SELECT public.sc_owner_center_ids()) OR public.is_admin()) '
      || 'WITH CHECK (service_center_id IN (SELECT public.sc_owner_center_ids()) OR public.is_admin())',
      pol, t
    );
  END LOOP;
END $$;

-- service_staff: direct owner/staff check (do not use sc_owner_center_ids here)
DROP POLICY IF EXISTS service_staff_sc ON public.service_staff;
CREATE POLICY service_staff_sc ON public.service_staff
  FOR ALL
  USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.service_centers sc
      WHERE sc.id = service_staff.service_center_id AND sc.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.service_centers sc
      WHERE sc.id = service_staff.service_center_id AND sc.owner_id = auth.uid()
    )
  );
