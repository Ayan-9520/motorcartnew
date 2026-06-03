-- =============================================================================
-- MOTORCART — Automotive ecosystem: workshop, tracking, invoices, OEM parts, suppliers
-- Requires bookings.service columns (from 00006) — re-added here if 00006 was skipped.
-- =============================================================================

-- Bookings columns used by tracking / mechanic RPCs (idempotent)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS mechanic_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pickup_address TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS drop_address TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_amount BIGINT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS tracking_step TEXT NOT NULL DEFAULT 'scheduled';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS otp_code TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_bookings_mechanic ON public.bookings(mechanic_id);

-- Parts: OEM vs aftermarket
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS part_origin TEXT NOT NULL DEFAULT 'aftermarket'
  CHECK (part_origin IN ('oem', 'aftermarket', 'genuine_accessory'));
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS mrp BIGINT;
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS supplier_sku TEXT;

CREATE INDEX IF NOT EXISTS idx_parts_origin ON public.parts(part_origin);
CREATE INDEX IF NOT EXISTS idx_parts_seller_stock ON public.parts(seller_id, stock);

-- Supplier business profile
CREATE TABLE IF NOT EXISTS public.parts_supplier_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  gstin TEXT,
  tier TEXT NOT NULL DEFAULT 'standard' CHECK (tier IN ('standard', 'preferred', 'oem_partner')),
  cities TEXT[] NOT NULL DEFAULT '{}',
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Workshop mechanics roster
CREATE TABLE IF NOT EXISTS public.workshop_mechanics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_center_id UUID NOT NULL REFERENCES public.service_centers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  phone TEXT,
  specialization TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workshop_mechanics_center ON public.workshop_mechanics(service_center_id);

-- Service invoices
CREATE TABLE IF NOT EXISTS public.service_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE UNIQUE,
  service_center_id UUID NOT NULL REFERENCES public.service_centers(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  line_items JSONB NOT NULL DEFAULT '[]',
  subtotal BIGINT NOT NULL DEFAULT 0,
  gst_amount BIGINT NOT NULL DEFAULT 0,
  grand_total BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'paid', 'cancelled')),
  issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vehicle service history (customer timeline)
CREATE TABLE IF NOT EXISTS public.vehicle_service_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  service_center_id UUID REFERENCES public.service_centers(id) ON DELETE SET NULL,
  vehicle_details JSONB NOT NULL DEFAULT '{}',
  service_name TEXT NOT NULL,
  center_name TEXT,
  odometer_km INT,
  total_amount BIGINT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_history_user ON public.vehicle_service_history(user_id, completed_at DESC);

-- Booking tracking audit trail
CREATE TABLE IF NOT EXISTS public.booking_tracking_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  step TEXT NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_tracking_booking ON public.booking_tracking_events(booking_id, created_at DESC);

CREATE SEQUENCE IF NOT EXISTS service_invoice_seq START 5001;

CREATE OR REPLACE FUNCTION public.next_service_invoice_number()
RETURNS TEXT LANGUAGE sql AS $$
  SELECT 'SVC-MC-' || to_char(NOW(), 'YYYYMM') || '-' || lpad(nextval('service_invoice_seq')::text, 5, '0');
$$;

-- Advance tracking + history event
CREATE OR REPLACE FUNCTION public.update_booking_tracking(
  p_booking_id UUID,
  p_step TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b RECORD;
BEGIN
  SELECT * INTO b FROM bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Booking not found');
  END IF;

  UPDATE bookings SET tracking_step = p_step, updated_at = NOW(),
    status = CASE
      WHEN p_step = 'completed' THEN 'completed'::booking_status
      WHEN p_step = 'cancelled' THEN 'cancelled'::booking_status
      WHEN p_step = 'in_service' THEN 'in_progress'::booking_status
      WHEN p_step IN ('confirmed', 'mechanic_assigned', 'en_route', 'arrived') THEN 'confirmed'::booking_status
      ELSE status
    END
  WHERE id = p_booking_id;

  INSERT INTO booking_tracking_events (booking_id, step, notes, created_by)
  VALUES (p_booking_id, p_step, p_notes, auth.uid());

  RETURN jsonb_build_object('ok', true, 'step', p_step);
END;
$$;

-- Assign mechanic from workshop roster
CREATE OR REPLACE FUNCTION public.assign_booking_mechanic(
  p_booking_id UUID,
  p_mechanic_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m RECORD;
BEGIN
  SELECT * INTO m FROM workshop_mechanics WHERE id = p_mechanic_id AND is_active = TRUE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Mechanic not found');
  END IF;

  UPDATE bookings
  SET mechanic_id = m.user_id, tracking_step = 'mechanic_assigned', updated_at = NOW(),
      status = 'confirmed'::booking_status
  WHERE id = p_booking_id AND service_center_id = m.service_center_id;

  INSERT INTO booking_tracking_events (booking_id, step, notes, created_by)
  VALUES (p_booking_id, 'mechanic_assigned', format('Assigned: %s', m.display_name), auth.uid());

  RETURN jsonb_build_object('ok', true, 'mechanic_user_id', m.user_id);
END;
$$;

-- Issue service invoice + service history on completion
CREATE OR REPLACE FUNCTION public.generate_service_invoice(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  inv_num TEXT;
  sub BIGINT;
  gst BIGINT;
  tot BIGINT;
  inv_id UUID;
  v_svc_name TEXT;
  v_center_name TEXT;
BEGIN
  SELECT bk.* INTO v_booking
  FROM bookings bk
  WHERE bk.id = p_booking_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Booking not found');
  END IF;

  SELECT s.name, sc.name
  INTO v_svc_name, v_center_name
  FROM services s
  JOIN service_centers sc ON sc.id = v_booking.service_center_id
  WHERE s.id = v_booking.service_id;

  IF EXISTS (SELECT 1 FROM service_invoices WHERE booking_id = p_booking_id) THEN
    SELECT invoice_number INTO inv_num FROM service_invoices WHERE booking_id = p_booking_id;
    RETURN jsonb_build_object('ok', true, 'invoice_number', inv_num, 'existing', true);
  END IF;

  tot := COALESCE(v_booking.total_amount, v_booking.payment_amount, 0);
  gst := ROUND(tot * 0.18 / 1.18);
  sub := tot - gst;
  inv_num := public.next_service_invoice_number();

  INSERT INTO service_invoices (
    booking_id, service_center_id, invoice_number, line_items,
    subtotal, gst_amount, grand_total, status, issued_at
  ) VALUES (
    p_booking_id, v_booking.service_center_id, inv_num,
    jsonb_build_array(jsonb_build_object('description', v_svc_name, 'amount', tot)),
    sub, gst, tot, 'issued', NOW()
  )
  RETURNING id INTO inv_id;

  IF v_booking.tracking_step = 'completed' OR v_booking.status = 'completed' THEN
    INSERT INTO vehicle_service_history (
      user_id, booking_id, service_center_id, vehicle_details,
      service_name, center_name, total_amount, completed_at
    ) VALUES (
      v_booking.user_id, p_booking_id, v_booking.service_center_id, v_booking.vehicle_details,
      v_svc_name, v_center_name, tot, COALESCE(v_booking.scheduled_at, NOW())
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'invoice_id', inv_id, 'invoice_number', inv_num);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_booking_tracking(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_booking_mechanic(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_service_invoice(UUID) TO authenticated;

-- RLS
ALTER TABLE public.parts_supplier_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_mechanics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_service_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_tracking_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS parts_supplier_profiles_own ON public.parts_supplier_profiles;
CREATE POLICY parts_supplier_profiles_own ON public.parts_supplier_profiles FOR ALL USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS workshop_mechanics_center ON public.workshop_mechanics;
CREATE POLICY workshop_mechanics_center ON public.workshop_mechanics FOR ALL USING (
  EXISTS (SELECT 1 FROM service_centers sc WHERE sc.id = service_center_id AND (sc.owner_id = auth.uid() OR public.is_admin()))
);

DROP POLICY IF EXISTS service_invoices_read ON public.service_invoices;
CREATE POLICY service_invoices_read ON public.service_invoices FOR SELECT USING (
  public.is_admin()
  OR EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_id AND b.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM service_centers sc WHERE sc.id = service_center_id AND sc.owner_id = auth.uid())
);

DROP POLICY IF EXISTS vehicle_service_history_own ON public.vehicle_service_history;
CREATE POLICY vehicle_service_history_own ON public.vehicle_service_history FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS booking_tracking_read ON public.booking_tracking_events;
CREATE POLICY booking_tracking_read ON public.booking_tracking_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_id AND (
    b.user_id = auth.uid()
    OR b.mechanic_id = auth.uid()
    OR EXISTS (SELECT 1 FROM service_centers sc WHERE sc.id = b.service_center_id AND sc.owner_id = auth.uid())
  ))
  OR public.is_admin()
);

-- Realtime
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.part_orders; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_tracking_events; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
