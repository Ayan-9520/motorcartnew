-- Automotive service booking: slots, pickup/drop, payments, OTP, technician role, RLS

ALTER TABLE service_centers ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE service_centers ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE service_centers ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
ALTER TABLE service_centers ADD COLUMN IF NOT EXISTS pickup_drop_available BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE service_centers ADD COLUMN IF NOT EXISTS slot_interval_minutes INT NOT NULL DEFAULT 30;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS mechanic_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pickup_address TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS drop_address TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_amount BIGINT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tracking_step TEXT NOT NULL DEFAULT 'scheduled';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS otp_code TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_bookings_mechanic ON bookings(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_bookings_center_status ON bookings(service_center_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_day ON bookings((scheduled_at::date));

-- Technician role (append to app_role enum)
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'service_technician';

DROP POLICY IF EXISTS service_centers_owner ON service_centers;
CREATE POLICY service_centers_owner ON service_centers FOR ALL USING (owner_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS services_owner_write ON services;
CREATE POLICY services_owner_write ON services FOR ALL USING (
  EXISTS (
    SELECT 1 FROM service_centers sc
    WHERE sc.id = services.service_center_id AND sc.owner_id = auth.uid()
  )
  OR public.is_admin()
);

-- Center owners & technicians can manage relevant bookings
DROP POLICY IF EXISTS bookings_center_read ON bookings;
CREATE POLICY bookings_center_read ON bookings FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM service_centers sc
    WHERE sc.id = bookings.service_center_id AND sc.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS bookings_center_update ON bookings;
CREATE POLICY bookings_center_update ON bookings FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM service_centers sc
    WHERE sc.id = bookings.service_center_id AND sc.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS bookings_technician_read ON bookings;
CREATE POLICY bookings_technician_read ON bookings FOR SELECT USING (mechanic_id = auth.uid());

DROP POLICY IF EXISTS bookings_technician_update ON bookings;
CREATE POLICY bookings_technician_update ON bookings FOR UPDATE USING (mechanic_id = auth.uid());

CREATE OR REPLACE FUNCTION public.verify_booking_otp(p_booking_id UUID, p_otp TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b RECORD;
BEGIN
  SELECT * INTO b FROM bookings WHERE id = p_booking_id AND user_id = auth.uid();
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Booking not found');
  END IF;
  IF b.otp_code IS NULL OR b.otp_expires_at < NOW() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'OTP expired or missing');
  END IF;
  IF b.otp_code <> p_otp THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid OTP');
  END IF;
  UPDATE bookings SET otp_verified = TRUE, tracking_step = 'confirmed', updated_at = NOW() WHERE id = p_booking_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_booking_otp TO authenticated;
