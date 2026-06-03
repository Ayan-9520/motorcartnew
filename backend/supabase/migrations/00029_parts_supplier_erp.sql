-- Parts Supplier ERP — warehouse, pricing, procurement, GST, analytics

DO $$ BEGIN
  CREATE TYPE public.ps_order_status AS ENUM (
    'pending', 'confirmed', 'packed', 'shipped', 'delivered',
    'return_requested', 'refunded', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.parts_products_ext (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  oem_code TEXT,
  hsn_code TEXT,
  moq INT NOT NULL DEFAULT 1,
  weight_kg DECIMAL(10,2),
  dimensions JSONB NOT NULL DEFAULT '{}',
  technical_specs JSONB NOT NULL DEFAULT '{}',
  warranty_months INT,
  UNIQUE (part_id)
);

CREATE TABLE IF NOT EXISTS public.parts_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  warehouse_id UUID,
  quantity INT NOT NULL DEFAULT 0,
  reserved INT NOT NULL DEFAULT 0,
  incoming INT NOT NULL DEFAULT 0,
  rack_code TEXT,
  stock_health TEXT DEFAULT 'normal',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.warehouse_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  zones JSONB NOT NULL DEFAULT '[]',
  utilization_pct INT DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.supplier_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL,
  price BIGINT NOT NULL,
  min_qty INT NOT NULL DEFAULT 1,
  valid_until DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.supplier_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  customer_type TEXT NOT NULL,
  gstin TEXT,
  phone TEXT,
  city TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.procurement_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  total_amount BIGINT DEFAULT 0,
  expected_at DATE,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.warehouse_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  from_warehouse_id UUID REFERENCES public.warehouse_locations(id) ON DELETE SET NULL,
  to_warehouse_id UUID REFERENCES public.warehouse_locations(id) ON DELETE SET NULL,
  part_id UUID REFERENCES public.parts(id) ON DELETE SET NULL,
  qty INT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.supplier_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT DEFAULT 'system',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.gst_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.part_orders(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  buyer_gstin TEXT,
  taxable_amount BIGINT NOT NULL,
  gst_amount BIGINT NOT NULL,
  total_amount BIGINT NOT NULL,
  status TEXT DEFAULT 'issued',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.return_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.part_orders(id) ON DELETE SET NULL,
  reason TEXT,
  status TEXT DEFAULT 'open',
  refund_amount BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parts_inventory_seller ON public.parts_inventory(seller_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_seller ON public.warehouse_locations(seller_id);
CREATE INDEX IF NOT EXISTS idx_supplier_pricing_part ON public.supplier_pricing(part_id, tier);

ALTER TABLE public.parts_products_ext ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.ps_seller_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid()
  WHERE auth.uid() IS NOT NULL;
$$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'parts_products_ext', 'parts_inventory', 'warehouse_locations',
    'supplier_pricing', 'supplier_customers', 'procurement_orders',
    'warehouse_transfers', 'supplier_notifications', 'gst_invoices', 'return_requests'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS ps_%s_own ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY ps_%s_own ON public.%I FOR ALL USING (seller_id IN (SELECT public.ps_seller_ids())) WITH CHECK (seller_id IN (SELECT public.ps_seller_ids()))',
      t, t
    );
  END LOOP;
END $$;
