-- =============================================================================
-- MOTORCART.IN — Complete Backend (Phase 2)
-- Single source of truth — NO duplicate tables (users only, not profiles)
-- Run in Supabase SQL Editor on a fresh project OR after dropping legacy tables
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- -----------------------------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM (
    'customer', 'dealer', 'used_car_dealer', 'new_car_dealer', 'bike_dealer',
    'truck_dealer', 'dsa_agent', 'bank_nbfc', 'service_center', 'parts_seller',
    'admin', 'auction_partner'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE kyc_status AS ENUM ('pending', 'submitted', 'verified', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE vehicle_condition AS ENUM ('new', 'used');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE vehicle_status AS ENUM ('draft', 'available', 'reserved', 'sold');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE fuel_type AS ENUM ('petrol', 'diesel', 'electric', 'hybrid', 'cng');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE transmission_type AS ENUM ('manual', 'automatic');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE auction_status AS ENUM ('upcoming', 'live', 'ended', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'converted', 'lost');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE finance_status AS ENUM ('draft', 'submitted', 'processing', 'approved', 'rejected', 'disbursed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE upload_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE doc_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE review_entity AS ENUM ('vehicle', 'dealer', 'service', 'part', 'service_center');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 1. USERS (public profile — linked to auth.users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  phone TEXT UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  role app_role NOT NULL DEFAULT 'customer',
  kyc_status kyc_status NOT NULL DEFAULT 'pending',
  kyc_data JSONB NOT NULL DEFAULT '{}',
  company_name TEXT,
  city TEXT,
  state TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- -----------------------------------------------------------------------------
-- 2. DEALERS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dealers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  description TEXT,
  dealer_type app_role NOT NULL DEFAULT 'dealer',
  rating DECIMAL(3,2) NOT NULL DEFAULT 0,
  review_count INT NOT NULL DEFAULT 0,
  address TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  specialties TEXT[] NOT NULL DEFAULT '{}',
  subscription_tier TEXT NOT NULL DEFAULT 'basic',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dealers_owner ON dealers(owner_id);
CREATE INDEX IF NOT EXISTS idx_dealers_city ON dealers(city);
CREATE INDEX IF NOT EXISTS idx_dealers_slug ON dealers(slug);

-- -----------------------------------------------------------------------------
-- 16. DSA AGENTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dsa_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  license_number TEXT,
  territory TEXT[] NOT NULL DEFAULT '{}',
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  total_disbursed BIGINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsa_agents_user ON dsa_agents(user_id);

-- -----------------------------------------------------------------------------
-- 7. BANKS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS banks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  bank_type TEXT NOT NULL DEFAULT 'nbfc',
  interest_rate_min DECIMAL(5,2) NOT NULL,
  interest_rate_max DECIMAL(5,2) NOT NULL,
  max_tenure_months INT NOT NULL DEFAULT 84,
  processing_fee TEXT,
  max_loan_amount BIGINT NOT NULL,
  features TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_banks_featured ON banks(is_featured) WHERE is_featured = TRUE;

-- -----------------------------------------------------------------------------
-- 18. SERVICE CENTERS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS service_centers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  address TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT,
  phone TEXT,
  rating DECIMAL(3,2) NOT NULL DEFAULT 0,
  review_count INT NOT NULL DEFAULT 0,
  services_offered TEXT[] NOT NULL DEFAULT '{}',
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  images TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_centers_city ON service_centers(city);
CREATE INDEX IF NOT EXISTS idx_service_centers_owner ON service_centers(owner_id);

-- -----------------------------------------------------------------------------
-- 19. INSURANCE PARTNERS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS insurance_partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  claim_settlement_ratio DECIMAL(5,2),
  plan_types TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. VEHICLES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id UUID REFERENCES dealers(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES users(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  variant TEXT,
  year INT NOT NULL,
  price BIGINT NOT NULL,
  original_price BIGINT,
  fuel_type fuel_type NOT NULL,
  transmission transmission_type NOT NULL,
  body_type TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'car',
  kms_driven INT NOT NULL DEFAULT 0,
  owners INT NOT NULL DEFAULT 1,
  color TEXT,
  location TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  images TEXT[] NOT NULL DEFAULT '{}',
  features TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  is_certified BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  condition vehicle_condition NOT NULL,
  status vehicle_status NOT NULL DEFAULT 'available',
  ai_price_score INT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_dealer ON vehicles(dealer_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_city ON vehicles(city);
CREATE INDEX IF NOT EXISTS idx_vehicles_price ON vehicles(price);
CREATE INDEX IF NOT EXISTS idx_vehicles_brand_model ON vehicles(brand, model);

-- -----------------------------------------------------------------------------
-- 4. AUCTIONS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auctions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  images TEXT[] NOT NULL DEFAULT '{}',
  starting_bid BIGINT NOT NULL,
  current_bid BIGINT,
  reserve_price BIGINT,
  bid_increment BIGINT NOT NULL DEFAULT 5000,
  bid_count INT NOT NULL DEFAULT 0,
  auction_type TEXT NOT NULL DEFAULT 'dealer',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status auction_status NOT NULL DEFAULT 'upcoming',
  winner_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);
CREATE INDEX IF NOT EXISTS idx_auctions_ends_at ON auctions(ends_at);
CREATE INDEX IF NOT EXISTS idx_auctions_vehicle ON auctions(vehicle_id);

-- -----------------------------------------------------------------------------
-- 5. BIDS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  is_auto_bid BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bids_auction ON bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_bids_bidder ON bids(bidder_id);
CREATE INDEX IF NOT EXISTS idx_bids_auction_amount ON bids(auction_id, amount DESC);

-- -----------------------------------------------------------------------------
-- 6. FINANCE APPLICATIONS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS finance_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  bank_id UUID REFERENCES banks(id) ON DELETE SET NULL,
  dsa_agent_id UUID REFERENCES dsa_agents(id) ON DELETE SET NULL,
  loan_amount BIGINT NOT NULL,
  tenure_months INT NOT NULL,
  interest_rate DECIMAL(5,2),
  emi_amount BIGINT,
  status finance_status NOT NULL DEFAULT 'draft',
  ai_eligibility_score INT,
  documents JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_user ON finance_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_status ON finance_applications(status);
CREATE INDEX IF NOT EXISTS idx_finance_dsa ON finance_applications(dsa_agent_id);

-- -----------------------------------------------------------------------------
-- 8. PARTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  brand TEXT,
  price BIGINT NOT NULL,
  original_price BIGINT,
  stock INT NOT NULL DEFAULT 0,
  rating DECIMAL(3,2) NOT NULL DEFAULT 0,
  review_count INT NOT NULL DEFAULT 0,
  images TEXT[] NOT NULL DEFAULT '{}',
  compatibility TEXT[] NOT NULL DEFAULT '{}',
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parts_seller ON parts(seller_id);
CREATE INDEX IF NOT EXISTS idx_parts_category ON parts(category);

-- -----------------------------------------------------------------------------
-- 9. SERVICES (catalog items at service centers)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_center_id UUID NOT NULL REFERENCES service_centers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  service_type TEXT NOT NULL,
  description TEXT,
  price_from BIGINT NOT NULL,
  price_to BIGINT,
  duration_minutes INT,
  is_doorstep BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  images TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(service_center_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_services_center ON services(service_center_id);
CREATE INDEX IF NOT EXISTS idx_services_type ON services(service_type);

-- -----------------------------------------------------------------------------
-- 10. BOOKINGS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  service_center_id UUID NOT NULL REFERENCES service_centers(id) ON DELETE CASCADE,
  vehicle_details JSONB NOT NULL DEFAULT '{}',
  scheduled_at TIMESTAMPTZ NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending',
  total_amount BIGINT,
  otp_verified BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_center ON bookings(service_center_id);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled ON bookings(scheduled_at);

-- -----------------------------------------------------------------------------
-- 11. LEADS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  source TEXT NOT NULL DEFAULT 'website',
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  vehicle_interest TEXT,
  status lead_status NOT NULL DEFAULT 'new',
  ai_score INT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_dealer ON leads(dealer_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to);

-- -----------------------------------------------------------------------------
-- 12. CONVERSATIONS (WhatsApp / web threads — messages in JSONB)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  dealer_id UUID REFERENCES dealers(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'web',
  subject TEXT,
  messages JSONB NOT NULL DEFAULT '[]',
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_lead ON conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversations_dealer ON conversations(dealer_id);

-- -----------------------------------------------------------------------------
-- 13. NOTIFICATIONS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  link TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- -----------------------------------------------------------------------------
-- 14. REVIEWS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type review_entity NOT NULL,
  entity_id UUID NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT,
  pros TEXT[] NOT NULL DEFAULT '{}',
  cons TEXT[] NOT NULL DEFAULT '{}',
  is_verified_purchase BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_entity ON reviews(entity_type, entity_id);

-- -----------------------------------------------------------------------------
-- 15. INVENTORY UPLOADS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT,
  status upload_status NOT NULL DEFAULT 'pending',
  total_rows INT NOT NULL DEFAULT 0,
  success_rows INT NOT NULL DEFAULT 0,
  failed_rows INT NOT NULL DEFAULT 0,
  error_log JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_inventory_uploads_dealer ON inventory_uploads(dealer_id);

-- -----------------------------------------------------------------------------
-- 17. DEALER DOCUMENTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dealer_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  status doc_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dealer_documents_dealer ON dealer_documents(dealer_id);

-- -----------------------------------------------------------------------------
-- 20. ANALYTICS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  dealer_id UUID REFERENCES dealers(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  payload JSONB NOT NULL DEFAULT '{}',
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_dealer ON analytics(dealer_id);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics(created_at DESC);

-- -----------------------------------------------------------------------------
-- HELPERS
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS app_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.owns_dealer(dealer_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dealers WHERE id = dealer_uuid AND owner_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Signup: create users row from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, phone, full_name, role, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'customer'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    phone = COALESCE(EXCLUDED.phone, users.phone),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- updated_at triggers
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','dealers','dsa_agents','banks','service_centers','insurance_partners',
    'vehicles','auctions','finance_applications','parts','services','bookings',
    'leads','conversations','reviews','dealer_documents'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS tr_%s_updated_at ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER tr_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at()', t, t);
  END LOOP;
END $$;

-- Bid: update auction current_bid
CREATE OR REPLACE FUNCTION public.on_new_bid()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.auctions
  SET current_bid = NEW.amount, bid_count = bid_count + 1, updated_at = NOW()
  WHERE id = NEW.auction_id AND (current_bid IS NULL OR NEW.amount > current_bid);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_bids_after_insert ON public.bids;
CREATE TRIGGER tr_bids_after_insert
  AFTER INSERT ON public.bids
  FOR EACH ROW EXECUTE FUNCTION public.on_new_bid();

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealers ENABLE ROW LEVEL SECURITY;
ALTER TABLE dsa_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealer_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- USERS
DROP POLICY IF EXISTS users_select_own ON users;
CREATE POLICY users_select_own ON users FOR SELECT USING (auth.uid() = id OR public.is_admin());
DROP POLICY IF EXISTS users_update_own ON users;
CREATE POLICY users_update_own ON users FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS users_insert_own ON users;
CREATE POLICY users_insert_own ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- DEALERS (public read verified)
DROP POLICY IF EXISTS dealers_public_read ON dealers;
CREATE POLICY dealers_public_read ON dealers FOR SELECT USING (true);
DROP POLICY IF EXISTS dealers_owner_write ON dealers;
CREATE POLICY dealers_owner_write ON dealers FOR ALL USING (owner_id = auth.uid() OR public.is_admin());

-- VEHICLES
DROP POLICY IF EXISTS vehicles_public_read ON vehicles;
CREATE POLICY vehicles_public_read ON vehicles FOR SELECT USING (status = 'available' OR public.is_admin() OR seller_id = auth.uid() OR public.owns_dealer(dealer_id));
DROP POLICY IF EXISTS vehicles_dealer_write ON vehicles;
CREATE POLICY vehicles_dealer_write ON vehicles FOR ALL USING (seller_id = auth.uid() OR public.owns_dealer(dealer_id) OR public.is_admin());

-- AUCTIONS & BIDS
DROP POLICY IF EXISTS auctions_public_read ON auctions;
CREATE POLICY auctions_public_read ON auctions FOR SELECT USING (true);
DROP POLICY IF EXISTS bids_public_read ON bids;
CREATE POLICY bids_public_read ON bids FOR SELECT USING (true);
DROP POLICY IF EXISTS bids_insert_auth ON bids;
CREATE POLICY bids_insert_auth ON bids FOR INSERT WITH CHECK (auth.uid() = bidder_id);

-- BANKS & INSURANCE (public read)
DROP POLICY IF EXISTS banks_public_read ON banks;
CREATE POLICY banks_public_read ON banks FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS insurance_public_read ON insurance_partners;
CREATE POLICY insurance_public_read ON insurance_partners FOR SELECT USING (is_active = true);

-- PARTS (public read active)
DROP POLICY IF EXISTS parts_public_read ON parts;
CREATE POLICY parts_public_read ON parts FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS parts_seller_write ON parts;
CREATE POLICY parts_seller_write ON parts FOR ALL USING (seller_id = auth.uid() OR public.is_admin());

-- SERVICES & SERVICE CENTERS
DROP POLICY IF EXISTS service_centers_public_read ON service_centers;
CREATE POLICY service_centers_public_read ON service_centers FOR SELECT USING (true);
DROP POLICY IF EXISTS services_public_read ON services;
CREATE POLICY services_public_read ON services FOR SELECT USING (is_active = true);

-- BOOKINGS
DROP POLICY IF EXISTS bookings_own ON bookings;
CREATE POLICY bookings_own ON bookings FOR ALL USING (user_id = auth.uid() OR public.is_admin());

-- LEADS (dealer team)
DROP POLICY IF EXISTS leads_dealer ON leads;
CREATE POLICY leads_dealer ON leads FOR ALL USING (public.owns_dealer(dealer_id) OR assigned_to = auth.uid() OR public.is_admin());

-- FINANCE
DROP POLICY IF EXISTS finance_own ON finance_applications;
CREATE POLICY finance_own ON finance_applications FOR ALL USING (user_id = auth.uid() OR public.is_admin());

-- NOTIFICATIONS
DROP POLICY IF EXISTS notifications_own ON notifications;
CREATE POLICY notifications_own ON notifications FOR ALL USING (user_id = auth.uid());

-- REVIEWS (public read)
DROP POLICY IF EXISTS reviews_public_read ON reviews;
CREATE POLICY reviews_public_read ON reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS reviews_insert_auth ON reviews;
CREATE POLICY reviews_insert_auth ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- INVENTORY & DOCS (dealer)
DROP POLICY IF EXISTS inventory_dealer ON inventory_uploads;
CREATE POLICY inventory_dealer ON inventory_uploads FOR ALL USING (public.owns_dealer(dealer_id) OR public.is_admin());
DROP POLICY IF EXISTS docs_dealer ON dealer_documents;
CREATE POLICY docs_dealer ON dealer_documents FOR ALL USING (public.owns_dealer(dealer_id) OR public.is_admin());

-- ANALYTICS (insert own, admin read all)
DROP POLICY IF EXISTS analytics_insert ON analytics;
CREATE POLICY analytics_insert ON analytics FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS analytics_admin ON analytics;
CREATE POLICY analytics_admin ON analytics FOR SELECT USING (public.is_admin() OR user_id = auth.uid());

-- DSA
DROP POLICY IF EXISTS dsa_own ON dsa_agents;
CREATE POLICY dsa_own ON dsa_agents FOR ALL USING (user_id = auth.uid() OR public.is_admin());

-- -----------------------------------------------------------------------------
-- STORAGE BUCKETS
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('vehicle-images', 'vehicle-images', true, 10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('dealer-documents', 'dealer-documents', false, 20971520, ARRAY['image/jpeg','image/png','application/pdf']),
  ('service-images', 'service-images', true, 10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('auction-images', 'auction-images', true, 10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('profile-images', 'profile-images', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS vehicle_images_public ON storage.objects;
CREATE POLICY vehicle_images_public ON storage.objects FOR SELECT USING (bucket_id = 'vehicle-images');
DROP POLICY IF EXISTS vehicle_images_auth ON storage.objects;
CREATE POLICY vehicle_images_auth ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'vehicle-images' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS profile_images_public ON storage.objects;
CREATE POLICY profile_images_public ON storage.objects FOR SELECT USING (bucket_id = 'profile-images');
DROP POLICY IF EXISTS profile_images_own ON storage.objects;
CREATE POLICY profile_images_own ON storage.objects FOR ALL USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS dealer_docs_own ON storage.objects;
CREATE POLICY dealer_docs_own ON storage.objects FOR ALL USING (bucket_id = 'dealer-documents' AND auth.uid() IS NOT NULL);

-- Seed banks (optional)
INSERT INTO banks (name, slug, bank_type, interest_rate_min, interest_rate_max, max_loan_amount, processing_fee, features, is_featured)
VALUES
  ('HDFC Bank', 'hdfc-bank', 'bank', 8.75, 12.5, 5000000, '0.5% of loan', ARRAY['Instant approval','Zero foreclosure'], true),
  ('ICICI Bank', 'icici-bank', 'bank', 8.99, 13.0, 7500000, '₹2,999 flat', ARRAY['Pre-approved offers'], true),
  ('SBI', 'sbi', 'bank', 8.50, 12.0, 5000000, '0.25%', ARRAY['Government bank'], true),
  ('Axis Bank', 'axis-bank', 'bank', 9.25, 13.5, 4000000, '1%', ARRAY['Quick disbursal'], false),
  ('Kotak Mahindra', 'kotak', 'bank', 9.0, 12.75, 3500000, '₹3,500', ARRAY['Digital KYC'], true)
ON CONFLICT (slug) DO NOTHING;
