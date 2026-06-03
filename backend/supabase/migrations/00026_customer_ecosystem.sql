-- Customer ownership ecosystem: garage, documents, wallet, insights, loyalty

DO $$ BEGIN
  CREATE TYPE public.customer_vehicle_segment AS ENUM ('car', 'bike', 'ev', 'commercial');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.vehicle_doc_type AS ENUM ('rc', 'insurance', 'puc', 'loan', 'warranty', 'invoice', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.customer_notification_type AS ENUM (
    'emi', 'insurance', 'service', 'auction', 'price_drop', 'dealer', 'ai', 'loyalty', 'system'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.customer_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  variant TEXT,
  year INT NOT NULL,
  fuel_type TEXT DEFAULT 'petrol',
  transmission TEXT DEFAULT 'manual',
  registration_number TEXT,
  registration_city TEXT,
  segment public.customer_vehicle_segment NOT NULL DEFAULT 'car',
  ownership_number INT DEFAULT 1,
  purchase_date DATE,
  odometer_km INT,
  health_score INT CHECK (health_score IS NULL OR (health_score >= 0 AND health_score <= 100)),
  resale_estimate BIGINT,
  fastag_balance BIGINT DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vehicle_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.customer_vehicles(id) ON DELETE CASCADE,
  doc_type public.vehicle_doc_type NOT NULL,
  title TEXT NOT NULL,
  file_url TEXT,
  document_number TEXT,
  issuer TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  expires_at DATE,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.insurance_wallet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.customer_vehicles(id) ON DELETE SET NULL,
  insurer_name TEXT NOT NULL,
  policy_number TEXT,
  plan_type TEXT,
  idv_amount BIGINT,
  annual_premium BIGINT,
  ncb_percent INT DEFAULT 0,
  policy_start DATE,
  policy_end DATE,
  claim_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  application_id UUID REFERENCES public.insurance_applications(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.service_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.customer_vehicles(id) ON DELETE SET NULL,
  service_center TEXT,
  service_type TEXT NOT NULL,
  odometer_km INT,
  amount BIGINT,
  next_due_date DATE,
  status TEXT NOT NULL DEFAULT 'completed',
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  serviced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reward_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  points INT NOT NULL,
  balance_after INT NOT NULL,
  source TEXT NOT NULL,
  reference_id TEXT,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type public.customer_notification_type NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  body TEXT,
  action_url TEXT,
  read_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customer_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  dob DATE,
  anniversary DATE,
  preferred_brand TEXT,
  city TEXT,
  state TEXT,
  notify_insurance BOOLEAN NOT NULL DEFAULT true,
  notify_service BOOLEAN NOT NULL DEFAULT true,
  notify_emi BOOLEAN NOT NULL DEFAULT true,
  notify_marketing BOOLEAN NOT NULL DEFAULT true,
  profile_completion INT NOT NULL DEFAULT 0 CHECK (profile_completion >= 0 AND profile_completion <= 100),
  loyalty_tier TEXT DEFAULT 'bronze',
  reward_points_balance INT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.customer_vehicles(id) ON DELETE SET NULL,
  insight_key TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  action_label TEXT,
  action_url TEXT,
  expires_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_vehicles_user ON public.customer_vehicles(user_id, is_primary DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_user ON public.vehicle_documents(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_insurance_wallet_user ON public.insurance_wallet(user_id, policy_end);
CREATE INDEX IF NOT EXISTS idx_service_records_user ON public.service_records(user_id, serviced_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON public.notification_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_user ON public.ai_insights(user_id, created_at DESC);

ALTER TABLE public.customer_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_vehicles_own ON public.customer_vehicles;
CREATE POLICY customer_vehicles_own ON public.customer_vehicles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS vehicle_documents_own ON public.vehicle_documents;
CREATE POLICY vehicle_documents_own ON public.vehicle_documents
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS insurance_wallet_own ON public.insurance_wallet;
CREATE POLICY insurance_wallet_own ON public.insurance_wallet
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS service_records_own ON public.service_records;
CREATE POLICY service_records_own ON public.service_records
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS reward_points_own ON public.reward_points;
CREATE POLICY reward_points_own ON public.reward_points
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS notification_logs_own ON public.notification_logs;
CREATE POLICY notification_logs_own ON public.notification_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS customer_preferences_own ON public.customer_preferences;
CREATE POLICY customer_preferences_own ON public.customer_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS ai_insights_own ON public.ai_insights;
CREATE POLICY ai_insights_own ON public.ai_insights
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
