-- CRM engagement & scheduled reminders (automation backbone)

DO $$ BEGIN
  CREATE TYPE public.reminder_kind AS ENUM (
    'insurance_expiry', 'service_due', 'emi_due', 'puc_expiry', 'document_expiry'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.engagement_campaign_type AS ENUM (
    'birthday', 'anniversary', 'insurance', 'service', 'upgrade', 'loyalty'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.scheduled_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.customer_vehicles(id) ON DELETE SET NULL,
  kind public.reminder_kind NOT NULL,
  title TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'in_app',
  due_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.engagement_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  campaign_type public.engagement_campaign_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  cta_label TEXT,
  cta_url TEXT,
  scheduled_for DATE,
  dismissed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_user ON public.scheduled_reminders(user_id, due_at);
CREATE INDEX IF NOT EXISTS idx_engagement_campaigns_user ON public.engagement_campaigns(user_id, scheduled_for);

ALTER TABLE public.scheduled_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scheduled_reminders_own ON public.scheduled_reminders;
CREATE POLICY scheduled_reminders_own ON public.scheduled_reminders
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS engagement_campaigns_own ON public.engagement_campaigns;
CREATE POLICY engagement_campaigns_own ON public.engagement_campaigns
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL) WITH CHECK (auth.uid() = user_id);
