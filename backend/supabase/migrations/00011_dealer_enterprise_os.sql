-- =============================================================================
-- MOTORCART — Dealer Enterprise OS (team, storefront, verification, plans)
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE public.dealer_verification_status AS ENUM (
    'pending', 'documents_submitted', 'under_review', 'verified', 'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.dealer_member_role AS ENUM ('owner', 'manager', 'sales', 'support');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Dealer profile extensions
ALTER TABLE public.dealers
  ADD COLUMN IF NOT EXISTS pan_number TEXT,
  ADD COLUMN IF NOT EXISTS verification_status public.dealer_verification_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_listings_cap INT NOT NULL DEFAULT 25;

UPDATE public.dealers SET subscription_tier = 'free' WHERE subscription_tier = 'basic';

-- Subscription plans (catalog)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_monthly INT NOT NULL DEFAULT 0,
  max_listings INT NOT NULL,
  max_team_members INT NOT NULL,
  features JSONB NOT NULL DEFAULT '[]',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.subscription_plans (code, name, price_monthly, max_listings, max_team_members, features, sort_order)
VALUES
  ('free', 'Free', 0, 25, 2, '["25 listings","Basic CRM","Public storefront"]', 1),
  ('premium', 'Premium', 4999, 150, 10, '["150 listings","Lead pipeline","WhatsApp CRM","Bulk upload","Analytics"]', 2),
  ('enterprise', 'Enterprise', 14999, 9999, 50, '["Unlimited listings","Team permissions","API access","Priority support","Auction desk"]', 3)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  max_listings = EXCLUDED.max_listings,
  max_team_members = EXCLUDED.max_team_members,
  features = EXCLUDED.features;

-- Team members (sub-users)
CREATE TABLE IF NOT EXISTS public.dealer_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role public.dealer_member_role NOT NULL DEFAULT 'sales',
  permissions JSONB NOT NULL DEFAULT '{"leads":true,"inventory":true,"calls":false}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (dealer_id, email)
);

CREATE INDEX IF NOT EXISTS idx_dealer_members_dealer ON public.dealer_members(dealer_id);
CREATE INDEX IF NOT EXISTS idx_dealer_members_user ON public.dealer_members(user_id);

-- Public storefront settings
CREATE TABLE IF NOT EXISTS public.dealer_storefronts (
  dealer_id UUID PRIMARY KEY REFERENCES public.dealers(id) ON DELETE CASCADE,
  seo_title TEXT,
  seo_description TEXT,
  cover_url TEXT,
  hero_tagline TEXT,
  showcase_tags TEXT[] NOT NULL DEFAULT '{}',
  show_finance_offers BOOLEAN NOT NULL DEFAULT TRUE,
  show_reviews BOOLEAN NOT NULL DEFAULT TRUE,
  show_inventory BOOLEAN NOT NULL DEFAULT TRUE,
  contact_whatsapp TEXT,
  contact_phone TEXT,
  business_hours JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lead notes (CRM timeline)
CREATE TABLE IF NOT EXISTS public.dealer_lead_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dealer_lead_notes_lead ON public.dealer_lead_notes(lead_id);

-- Auction participation
CREATE TABLE IF NOT EXISTS public.dealer_auction_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'registered',
  max_bid BIGINT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (dealer_id, auction_id)
);

CREATE INDEX IF NOT EXISTS idx_dealer_auction_dealer ON public.dealer_auction_entries(dealer_id);

-- CRM task types
ALTER TABLE public.crm_tasks
  ADD COLUMN IF NOT EXISTS task_type TEXT NOT NULL DEFAULT 'callback';

-- Sync verification from is_verified
UPDATE public.dealers
SET verification_status = 'verified'
WHERE is_verified = TRUE AND verification_status = 'pending';

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_storefronts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_auction_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscription_plans_read ON public.subscription_plans;
CREATE POLICY subscription_plans_read ON public.subscription_plans FOR SELECT USING (true);

DROP POLICY IF EXISTS dealer_members_dealer ON public.dealer_members;
CREATE POLICY dealer_members_dealer ON public.dealer_members
  FOR ALL USING (public.owns_dealer(dealer_id) OR public.is_admin());

DROP POLICY IF EXISTS dealer_storefronts_public ON public.dealer_storefronts;
CREATE POLICY dealer_storefronts_public ON public.dealer_storefronts FOR SELECT USING (true);
DROP POLICY IF EXISTS dealer_storefronts_owner ON public.dealer_storefronts;
CREATE POLICY dealer_storefronts_owner ON public.dealer_storefronts
  FOR ALL USING (public.owns_dealer(dealer_id) OR public.is_admin());

DROP POLICY IF EXISTS dealer_lead_notes_dealer ON public.dealer_lead_notes;
CREATE POLICY dealer_lead_notes_dealer ON public.dealer_lead_notes
  FOR ALL USING (public.owns_dealer(dealer_id) OR public.is_admin());

DROP POLICY IF EXISTS dealer_auction_entries_dealer ON public.dealer_auction_entries;
CREATE POLICY dealer_auction_entries_dealer ON public.dealer_auction_entries
  FOR ALL USING (public.owns_dealer(dealer_id) OR public.is_admin());

-- Finance apps visible to dealer via vehicle ownership
DROP POLICY IF EXISTS finance_dealer_vehicle ON public.finance_applications;
CREATE POLICY finance_dealer_vehicle ON public.finance_applications
  FOR SELECT USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.vehicles v
      JOIN public.dealers d ON d.id = v.dealer_id
      WHERE v.id = finance_applications.vehicle_id AND d.owner_id = auth.uid()
    )
  );

-- Triggers
DROP TRIGGER IF EXISTS tr_dealer_members_updated_at ON public.dealer_members;
CREATE TRIGGER tr_dealer_members_updated_at
  BEFORE UPDATE ON public.dealer_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS tr_dealer_auction_entries_updated_at ON public.dealer_auction_entries;
CREATE TRIGGER tr_dealer_auction_entries_updated_at
  BEFORE UPDATE ON public.dealer_auction_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
