-- New Car Dealer OS — showroom, inventory, CRM, bookings, delivery

DO $$ BEGIN
  CREATE TYPE public.ncd_stock_status AS ENUM ('available', 'booked', 'transit', 'upcoming', 'delivered');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.ncd_lead_stage AS ENUM (
    'new', 'contacted', 'interested', 'test_drive', 'negotiation',
    'finance', 'booking', 'delivered', 'lost'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.ncd_booking_status AS ENUM (
    'pending', 'finance_processing', 'approved', 'vehicle_allocated', 'invoiced', 'delivered'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.new_car_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  variant TEXT NOT NULL,
  fuel_type TEXT,
  transmission TEXT,
  ex_showroom_price BIGINT NOT NULL,
  on_road_price BIGINT,
  discount_amount BIGINT DEFAULT 0,
  stock_status public.ncd_stock_status NOT NULL DEFAULT 'available',
  stock_health TEXT DEFAULT 'fast_moving',
  colors JSONB NOT NULL DEFAULT '[]',
  features JSONB NOT NULL DEFAULT '[]',
  expected_delivery_days INT,
  mileage TEXT,
  seating INT,
  safety_rating TEXT,
  warranty TEXT,
  image_url TEXT,
  brochure_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dealer_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  city TEXT,
  source TEXT NOT NULL DEFAULT 'website',
  stage public.ncd_lead_stage NOT NULL DEFAULT 'new',
  preferred_brand TEXT,
  preferred_model TEXT,
  budget_min BIGINT,
  budget_max BIGINT,
  trade_in_vehicle TEXT,
  finance_interest BOOLEAN DEFAULT false,
  insurance_interest BOOLEAN DEFAULT false,
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  score INT DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lead_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.dealer_leads(id) ON DELETE CASCADE,
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  channel TEXT DEFAULT 'call',
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vehicle_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.dealer_leads(id) ON DELETE SET NULL,
  inventory_id UUID REFERENCES public.new_car_inventory(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  token_amount BIGINT DEFAULT 0,
  booking_amount BIGINT,
  status public.ncd_booking_status NOT NULL DEFAULT 'pending',
  agreement_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  booked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.showroom_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  phone TEXT,
  monthly_target INT DEFAULT 0,
  leads_assigned INT DEFAULT 0,
  cars_sold_mtd INT DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.delivery_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.vehicle_bookings(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  vehicle_label TEXT NOT NULL,
  pdi_complete BOOLEAN DEFAULT false,
  rc_status TEXT DEFAULT 'pending',
  accessories_installed BOOLEAN DEFAULT false,
  delivery_date DATE,
  metadata JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.exchange_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.dealer_leads(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  old_vehicle TEXT NOT NULL,
  valuation_amount BIGINT,
  inspection_status TEXT DEFAULT 'pending',
  ai_estimate BIGINT,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dealer_ncd_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT DEFAULT 'system',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  reach INT DEFAULT 0,
  conversions INT DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ncd_inventory_dealer ON public.new_car_inventory(dealer_id, stock_status);
CREATE INDEX IF NOT EXISTS idx_dealer_leads_dealer ON public.dealer_leads(dealer_id, stage);
CREATE INDEX IF NOT EXISTS idx_vehicle_bookings_dealer ON public.vehicle_bookings(dealer_id, status);

ALTER TABLE public.new_car_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showroom_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_ncd_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

-- Dealer access: owner, team members (dealer_members), showroom staff
CREATE OR REPLACE FUNCTION public.ncd_user_dealer_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.dealers WHERE owner_id = auth.uid()
  UNION
  SELECT dealer_id FROM public.dealer_members
    WHERE user_id = auth.uid() AND is_active = true
  UNION
  SELECT dealer_id FROM public.showroom_staff
    WHERE user_id = auth.uid() AND dealer_id IS NOT NULL;
$$;

DROP POLICY IF EXISTS ncd_inventory_dealer ON public.new_car_inventory;
CREATE POLICY ncd_inventory_dealer ON public.new_car_inventory
  FOR ALL USING (dealer_id IN (SELECT public.ncd_user_dealer_ids()))
  WITH CHECK (dealer_id IN (SELECT public.ncd_user_dealer_ids()));

DROP POLICY IF EXISTS dealer_leads_dealer ON public.dealer_leads;
CREATE POLICY dealer_leads_dealer ON public.dealer_leads
  FOR ALL USING (dealer_id IN (SELECT public.ncd_user_dealer_ids()))
  WITH CHECK (dealer_id IN (SELECT public.ncd_user_dealer_ids()));

DROP POLICY IF EXISTS lead_followups_dealer ON public.lead_followups;
CREATE POLICY lead_followups_dealer ON public.lead_followups
  FOR ALL USING (dealer_id IN (SELECT public.ncd_user_dealer_ids()))
  WITH CHECK (dealer_id IN (SELECT public.ncd_user_dealer_ids()));

DROP POLICY IF EXISTS vehicle_bookings_dealer ON public.vehicle_bookings;
CREATE POLICY vehicle_bookings_dealer ON public.vehicle_bookings
  FOR ALL USING (dealer_id IN (SELECT public.ncd_user_dealer_ids()))
  WITH CHECK (dealer_id IN (SELECT public.ncd_user_dealer_ids()));

DROP POLICY IF EXISTS showroom_staff_dealer ON public.showroom_staff;
CREATE POLICY showroom_staff_dealer ON public.showroom_staff
  FOR ALL USING (dealer_id IN (SELECT public.ncd_user_dealer_ids()))
  WITH CHECK (dealer_id IN (SELECT public.ncd_user_dealer_ids()));

DROP POLICY IF EXISTS delivery_tracking_dealer ON public.delivery_tracking;
CREATE POLICY delivery_tracking_dealer ON public.delivery_tracking
  FOR ALL USING (dealer_id IN (SELECT public.ncd_user_dealer_ids()))
  WITH CHECK (dealer_id IN (SELECT public.ncd_user_dealer_ids()));

DROP POLICY IF EXISTS exchange_requests_dealer ON public.exchange_requests;
CREATE POLICY exchange_requests_dealer ON public.exchange_requests
  FOR ALL USING (dealer_id IN (SELECT public.ncd_user_dealer_ids()))
  WITH CHECK (dealer_id IN (SELECT public.ncd_user_dealer_ids()));

DROP POLICY IF EXISTS dealer_ncd_notifications_dealer ON public.dealer_ncd_notifications;
CREATE POLICY dealer_ncd_notifications_dealer ON public.dealer_ncd_notifications
  FOR ALL USING (dealer_id IN (SELECT public.ncd_user_dealer_ids()))
  WITH CHECK (dealer_id IN (SELECT public.ncd_user_dealer_ids()));

DROP POLICY IF EXISTS marketing_campaigns_dealer ON public.marketing_campaigns;
CREATE POLICY marketing_campaigns_dealer ON public.marketing_campaigns
  FOR ALL USING (dealer_id IN (SELECT public.ncd_user_dealer_ids()))
  WITH CHECK (dealer_id IN (SELECT public.ncd_user_dealer_ids()));
