-- Fix 42703: column b.mechanic_id does not exist (00006 skipped before 00014)
-- Run this alone, then re-run 00014 from booking_tracking_read policy onward if needed.

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

DROP POLICY IF EXISTS booking_tracking_read ON public.booking_tracking_events;
CREATE POLICY booking_tracking_read ON public.booking_tracking_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_id AND (
    b.user_id = auth.uid()
    OR b.mechanic_id = auth.uid()
    OR EXISTS (SELECT 1 FROM service_centers sc WHERE sc.id = b.service_center_id AND sc.owner_id = auth.uid())
  ))
  OR public.is_admin()
);

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.part_orders; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_tracking_events; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
