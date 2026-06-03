-- Platform admin: CMS, banners, notifications, support tickets, fraud desk

DO $$ BEGIN
  CREATE TYPE platform_ticket_status AS ENUM ('open', 'pending', 'resolved', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE platform_ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE platform_fraud_status AS ENUM ('open', 'reviewing', 'cleared', 'blocked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.platform_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  placement TEXT NOT NULL DEFAULT 'home_hero',
  image_url TEXT,
  link_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.platform_cms_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  seo JSONB NOT NULL DEFAULT '{}',
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.platform_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email', 'push', 'sms')),
  audience TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'dealers', 'customers', 'staff')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  requester_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  requester_email TEXT,
  assignee_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status platform_ticket_status NOT NULL DEFAULT 'open',
  priority platform_ticket_priority NOT NULL DEFAULT 'medium',
  category TEXT NOT NULL DEFAULT 'general',
  metadata JSONB NOT NULL DEFAULT '{}',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.platform_fraud_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT 'system',
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  risk_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  status platform_fraud_status NOT NULL DEFAULT 'open',
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.platform_report_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_key TEXT NOT NULL,
  title TEXT NOT NULL,
  period_label TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  generated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_platform_fraud_status ON public.platform_fraud_alerts(status);
CREATE INDEX IF NOT EXISTS idx_platform_banners_active ON public.platform_banners(is_active, sort_order);

ALTER TABLE public.platform_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_cms_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_fraud_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_report_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_banners_admin ON public.platform_banners;
CREATE POLICY platform_banners_admin ON public.platform_banners
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS platform_cms_admin ON public.platform_cms_pages;
CREATE POLICY platform_cms_admin ON public.platform_cms_pages
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS platform_notifications_admin ON public.platform_notifications;
CREATE POLICY platform_notifications_admin ON public.platform_notifications
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS support_tickets_admin ON public.support_tickets;
CREATE POLICY support_tickets_admin ON public.support_tickets
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS platform_fraud_admin ON public.platform_fraud_alerts;
CREATE POLICY platform_fraud_admin ON public.platform_fraud_alerts
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS platform_reports_admin ON public.platform_report_snapshots;
CREATE POLICY platform_reports_admin ON public.platform_report_snapshots
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Staff can read published CMS (public site)
DROP POLICY IF EXISTS platform_cms_public_read ON public.platform_cms_pages;
CREATE POLICY platform_cms_public_read ON public.platform_cms_pages
  FOR SELECT USING (status = 'published');

-- Active banners for anon/authenticated storefront
DROP POLICY IF EXISTS platform_banners_public_read ON public.platform_banners;
CREATE POLICY platform_banners_public_read ON public.platform_banners
  FOR SELECT USING (
    is_active = true
    AND (starts_at IS NULL OR starts_at <= NOW())
    AND (ends_at IS NULL OR ends_at >= NOW())
  );
