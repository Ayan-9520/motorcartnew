-- Parts Supplier OS — enterprise extensions (RFQ, staff, logistics, compat, analytics)

CREATE TABLE IF NOT EXISTS public.parts_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.parts_categories(id) ON DELETE SET NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (seller_id, slug)
);

CREATE TABLE IF NOT EXISTS public.warehouse_racks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES public.warehouse_locations(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  zone TEXT,
  capacity INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.parts_compat_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  variant TEXT,
  year_from INT,
  year_to INT,
  fuel_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rfq_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.supplier_customers(id) ON DELETE SET NULL,
  requester_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  items JSONB NOT NULL DEFAULT '[]',
  quoted_amount BIGINT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.procurement_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES public.procurement_orders(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sku TEXT,
  description TEXT,
  qty INT NOT NULL,
  unit_cost BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.logistics_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.part_orders(id) ON DELETE SET NULL,
  carrier TEXT,
  awb TEXT,
  status TEXT DEFAULT 'created',
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.supplier_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'outbound',
  body TEXT,
  order_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parts_compat_part ON public.parts_compat_matrix(part_id);
CREATE INDEX IF NOT EXISTS idx_rfq_seller ON public.rfq_requests(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_analytics_seller ON public.analytics_events(seller_id, created_at DESC);

ALTER TABLE public.parts_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_racks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts_compat_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logistics_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'parts_categories', 'warehouse_racks', 'parts_compat_matrix', 'rfq_requests',
    'procurement_items', 'logistics_shipments', 'supplier_staff', 'whatsapp_logs', 'analytics_events'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS ps_ent_%s_own ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY ps_ent_%s_own ON public.%I FOR ALL USING (seller_id IN (SELECT public.ps_seller_ids())) WITH CHECK (seller_id IN (SELECT public.ps_seller_ids()))',
      t, t
    );
  END LOOP;
END $$;
