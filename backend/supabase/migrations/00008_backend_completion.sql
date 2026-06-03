-- =============================================================================
-- MOTORCART.IN — Backend completion (RLS fixes, normalized tables, CRM, realtime)
-- Run after 00001–00007
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Schema extensions
-- -----------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

ALTER TABLE public.dealers
  ADD COLUMN IF NOT EXISTS gst_number TEXT,
  ADD COLUMN IF NOT EXISTS total_sales INT NOT NULL DEFAULT 0;

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS emi_estimate BIGINT,
  ADD COLUMN IF NOT EXISTS discount_amount BIGINT,
  ADD COLUMN IF NOT EXISTS view_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT TRUE;

-- -----------------------------------------------------------------------------
-- VEHICLE IMAGES (normalized)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicle_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_images_vehicle ON public.vehicle_images(vehicle_id);

-- -----------------------------------------------------------------------------
-- VEHICLE SPECS (normalized)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicle_specs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL UNIQUE REFERENCES public.vehicles(id) ON DELETE CASCADE,
  engine TEXT,
  mileage TEXT,
  power TEXT,
  torque TEXT,
  seating_capacity INT,
  airbags INT,
  abs BOOLEAN DEFAULT TRUE,
  infotainment TEXT,
  boot_space TEXT,
  extras JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- CRM: call logs & tasks
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  called_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  direction TEXT NOT NULL DEFAULT 'outbound',
  duration_seconds INT,
  outcome TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_calls_lead ON public.lead_calls(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_calls_dealer ON public.lead_calls(dealer_id);

CREATE TABLE IF NOT EXISTS public.crm_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'normal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_tasks_dealer ON public.crm_tasks(dealer_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_assigned ON public.crm_tasks(assigned_to);

-- -----------------------------------------------------------------------------
-- Sync vehicle_images from vehicles.images array (one-time helper)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_vehicle_images_from_array()
RETURNS void AS $$
DECLARE
  v RECORD;
  i INT;
  img TEXT;
BEGIN
  FOR v IN SELECT id, images FROM public.vehicles WHERE array_length(images, 1) > 0 LOOP
    IF NOT EXISTS (SELECT 1 FROM public.vehicle_images WHERE vehicle_id = v.id LIMIT 1) THEN
      i := 0;
      FOREACH img IN ARRAY v.images LOOP
        INSERT INTO public.vehicle_images (vehicle_id, image_url, is_primary, sort_order)
        VALUES (v.id, img, i = 0, i);
        i := i + 1;
      END LOOP;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT public.sync_vehicle_images_from_array();

-- -----------------------------------------------------------------------------
-- Notification helper (in-app)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_link TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  nid UUID;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, link, metadata)
  VALUES (p_user_id, p_title, p_message, p_type, p_link, p_metadata)
  RETURNING id INTO nid;
  RETURN nid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Lead status change → notify dealer owner
CREATE OR REPLACE FUNCTION public.notify_lead_status_change()
RETURNS TRIGGER AS $$
DECLARE
  owner UUID;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT d.owner_id INTO owner FROM public.dealers d WHERE d.id = NEW.dealer_id;
    IF owner IS NOT NULL THEN
      PERFORM public.create_notification(
        owner,
        'Lead status updated',
        format('Lead %s moved to %s', NEW.name, NEW.status),
        'lead',
        '/dashboard/dealer/leads',
        jsonb_build_object('lead_id', NEW.id, 'status', NEW.status)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_leads_notify_status ON public.leads;
CREATE TRIGGER tr_leads_notify_status
  AFTER UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.notify_lead_status_change();

-- -----------------------------------------------------------------------------
-- RLS: new tables
-- -----------------------------------------------------------------------------
ALTER TABLE public.vehicle_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vehicle_images_public_read ON public.vehicle_images;
CREATE POLICY vehicle_images_public_read ON public.vehicle_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.id = vehicle_id AND (v.status = 'available' OR public.is_admin() OR public.owns_dealer(v.dealer_id) OR v.seller_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS vehicle_images_dealer_write ON public.vehicle_images;
CREATE POLICY vehicle_images_dealer_write ON public.vehicle_images
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.id = vehicle_id AND (public.owns_dealer(v.dealer_id) OR v.seller_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS vehicle_specs_public_read ON public.vehicle_specs;
CREATE POLICY vehicle_specs_public_read ON public.vehicle_specs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.id = vehicle_id AND (v.status = 'available' OR public.is_admin() OR public.owns_dealer(v.dealer_id) OR v.seller_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS vehicle_specs_dealer_write ON public.vehicle_specs;
CREATE POLICY vehicle_specs_dealer_write ON public.vehicle_specs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.id = vehicle_id AND (public.owns_dealer(v.dealer_id) OR v.seller_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS lead_calls_dealer ON public.lead_calls;
CREATE POLICY lead_calls_dealer ON public.lead_calls
  FOR ALL USING (public.owns_dealer(dealer_id) OR public.is_admin());

DROP POLICY IF EXISTS crm_tasks_dealer ON public.crm_tasks;
CREATE POLICY crm_tasks_dealer ON public.crm_tasks
  FOR ALL USING (public.owns_dealer(dealer_id) OR assigned_to = auth.uid() OR public.is_admin());

-- -----------------------------------------------------------------------------
-- RLS: conversations (was enabled with no policies)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS conversations_participants ON public.conversations;
CREATE POLICY conversations_participants ON public.conversations
  FOR ALL USING (
    customer_id = auth.uid()
    OR public.owns_dealer(dealer_id)
    OR public.is_admin()
  );

-- -----------------------------------------------------------------------------
-- RLS: auction write (organizer + admin)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS auctions_organizer_write ON public.auctions;
CREATE POLICY auctions_organizer_write ON public.auctions
  FOR ALL USING (organizer_id = auth.uid() OR public.is_admin());

-- -----------------------------------------------------------------------------
-- Storage: parts-images policies if missing
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS part_images_public ON storage.objects;
CREATE POLICY part_images_public ON storage.objects
  FOR SELECT USING (bucket_id = 'part-images');

DROP POLICY IF EXISTS part_images_auth ON storage.objects;
CREATE POLICY part_images_auth ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'part-images' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS auction_images_auth ON storage.objects;
CREATE POLICY auction_images_auth ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'auction-images' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS service_images_auth ON storage.objects;
CREATE POLICY service_images_auth ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'service-images' AND auth.uid() IS NOT NULL);

-- -----------------------------------------------------------------------------
-- Realtime publication
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'part_orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.part_orders;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'leads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'social_posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.social_posts;
  END IF;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

-- -----------------------------------------------------------------------------
-- Banks: ensure all major lenders (upsert by slug)
-- -----------------------------------------------------------------------------
INSERT INTO public.banks (name, slug, short_code, bank_type, interest_rate_min, interest_rate_max, max_loan_amount, max_tenure_months, processing_fee, features, is_featured, ranking_score, min_cibil)
VALUES
  ('State Bank of India', 'sbi', 'SBI', 'bank', 8.50, 12.00, 5000000, 84, '0.25%', ARRAY['Government bank','Wide network'], true, 95, 650),
  ('Bank of Baroda', 'bob', 'BOB', 'bank', 8.65, 12.25, 4500000, 84, '0.35%', ARRAY['Public sector'], true, 88, 650),
  ('Bank of India', 'boi', 'BOI', 'bank', 8.70, 12.30, 4000000, 84, '0.40%', ARRAY['Public sector'], false, 82, 650),
  ('Punjab National Bank', 'pnb', 'PNB', 'bank', 8.55, 12.15, 4500000, 84, '0.30%', ARRAY['Public sector'], true, 86, 650),
  ('Indian Overseas Bank', 'iob', 'IOB', 'bank', 8.80, 12.40, 3500000, 72, '0.45%', ARRAY['Public sector'], false, 78, 640),
  ('UCO Bank', 'uco', 'UCO', 'bank', 8.85, 12.50, 3000000, 72, '0.50%', ARRAY['Public sector'], false, 75, 640),
  ('HDFC Bank', 'hdfc-bank', 'HDFC', 'bank', 8.75, 12.50, 5000000, 84, '0.5% of loan', ARRAY['Instant approval','Zero foreclosure'], true, 98, 700),
  ('ICICI Bank', 'icici-bank', 'ICICI', 'bank', 8.99, 13.00, 7500000, 84, '₹2,999 flat', ARRAY['Pre-approved offers'], true, 96, 700),
  ('Axis Bank', 'axis-bank', 'AXIS', 'bank', 9.25, 13.50, 4000000, 84, '1%', ARRAY['Quick disbursal'], true, 90, 680),
  ('Kotak Mahindra Bank', 'kotak', 'KOTAK', 'bank', 9.00, 12.75, 3500000, 84, '₹3,500', ARRAY['Digital KYC'], true, 92, 680),
  ('AU Small Finance Bank', 'au-bank', 'AU', 'bank', 9.50, 14.00, 2500000, 60, '1.5%', ARRAY['NBFC partner'], false, 80, 650),
  ('Cholamandalam Finance', 'cholamandalam', 'CHOLA', 'nbfc', 10.25, 15.50, 3000000, 60, '2%', ARRAY['Used car specialist'], true, 85, 620),
  ('Mahindra Finance', 'mahindra-finance', 'M&M', 'nbfc', 9.75, 14.25, 3500000, 72, '1.75%', ARRAY['Rural reach'], true, 87, 630),
  ('Vastu Housing Finance', 'vastu', 'VASTU', 'nbfc', 10.50, 16.00, 2000000, 60, '2.5%', ARRAY['Affordable loans'], false, 72, 600)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  short_code = EXCLUDED.short_code,
  interest_rate_min = EXCLUDED.interest_rate_min,
  interest_rate_max = EXCLUDED.interest_rate_max,
  max_loan_amount = EXCLUDED.max_loan_amount,
  is_featured = EXCLUDED.is_featured,
  ranking_score = EXCLUDED.ranking_score,
  updated_at = NOW();

-- -----------------------------------------------------------------------------
-- updated_at triggers for new tables
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS tr_vehicle_specs_updated_at ON public.vehicle_specs;
CREATE TRIGGER tr_vehicle_specs_updated_at
  BEFORE UPDATE ON public.vehicle_specs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS tr_crm_tasks_updated_at ON public.crm_tasks;
CREATE TRIGGER tr_crm_tasks_updated_at
  BEFORE UPDATE ON public.crm_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
