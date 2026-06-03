-- Auto parts marketplace: GST, wholesale, bulk, orders, invoices, COD

ALTER TABLE parts ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE parts ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE parts ADD COLUMN IF NOT EXISTS gst_rate DECIMAL(5,2) NOT NULL DEFAULT 18;
ALTER TABLE parts ADD COLUMN IF NOT EXISTS wholesale_price BIGINT;
ALTER TABLE parts ADD COLUMN IF NOT EXISTS bulk_min_qty INT NOT NULL DEFAULT 1;
ALTER TABLE parts ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';

DO $$ BEGIN
  CREATE TYPE part_order_status AS ENUM (
    'pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE part_payment_method AS ENUM ('cod', 'online', 'whatsapp');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS part_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status part_order_status NOT NULL DEFAULT 'pending',
  payment_method part_payment_method NOT NULL DEFAULT 'cod',
  cod_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  subtotal BIGINT NOT NULL DEFAULT 0,
  gst_total BIGINT NOT NULL DEFAULT 0,
  grand_total BIGINT NOT NULL DEFAULT 0,
  shipping_address JSONB NOT NULL DEFAULT '{}',
  tracking_number TEXT,
  carrier TEXT,
  invoice_number TEXT UNIQUE,
  invoice_snapshot JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS part_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES part_orders(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES parts(id),
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  qty INT NOT NULL CHECK (qty > 0),
  unit_price BIGINT NOT NULL,
  gst_rate DECIMAL(5,2) NOT NULL DEFAULT 18,
  line_subtotal BIGINT NOT NULL,
  line_gst BIGINT NOT NULL,
  line_total BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_part_orders_user ON part_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_part_orders_status ON part_orders(status);
CREATE INDEX IF NOT EXISTS idx_part_order_items_order ON part_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_part_order_items_seller ON part_order_items(seller_id);

ALTER TABLE part_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE part_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS part_orders_own ON part_orders;
CREATE POLICY part_orders_own ON part_orders FOR SELECT USING (
  user_id = auth.uid() OR public.is_admin()
);

DROP POLICY IF EXISTS part_orders_insert_own ON part_orders;
CREATE POLICY part_orders_insert_own ON part_orders FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS part_orders_seller_read ON part_orders;
CREATE POLICY part_orders_seller_read ON part_orders FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM part_order_items poi
    WHERE poi.order_id = part_orders.id AND poi.seller_id = auth.uid()
  )
);

DROP POLICY IF EXISTS part_orders_seller_update ON part_orders;
CREATE POLICY part_orders_seller_update ON part_orders FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM part_order_items poi
    WHERE poi.order_id = part_orders.id AND poi.seller_id = auth.uid()
  ) OR public.is_admin()
);

DROP POLICY IF EXISTS part_order_items_own ON part_order_items;
CREATE POLICY part_order_items_own ON part_order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM part_orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  OR seller_id = auth.uid()
  OR public.is_admin()
);

DROP POLICY IF EXISTS part_order_items_insert ON part_order_items;
CREATE POLICY part_order_items_insert ON part_order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM part_orders o WHERE o.id = order_id AND o.user_id = auth.uid())
);

-- Invoice number sequence
CREATE SEQUENCE IF NOT EXISTS part_invoice_seq START 10001;

CREATE OR REPLACE FUNCTION public.next_part_invoice_number()
RETURNS TEXT LANGUAGE sql AS $$
  SELECT 'INV-MC-' || to_char(NOW(), 'YYYYMM') || '-' || lpad(nextval('part_invoice_seq')::text, 5, '0');
$$;

CREATE OR REPLACE FUNCTION public.create_part_order(
  p_items JSONB,
  p_payment_method TEXT,
  p_shipping JSONB,
  p_cod BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_order_id UUID;
  v_item JSONB;
  v_part RECORD;
  v_sub BIGINT := 0;
  v_gst BIGINT := 0;
  v_total BIGINT := 0;
  v_line_sub BIGINT;
  v_line_gst BIGINT;
  v_line_total BIGINT;
  v_inv TEXT;
  v_snap JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Authentication required');
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cart is empty');
  END IF;

  INSERT INTO part_orders (user_id, payment_method, cod_confirmed, shipping_address, status)
  VALUES (v_uid, p_payment_method::part_payment_method, p_cod, p_shipping, 'pending')
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_part FROM parts WHERE id = (v_item->>'part_id')::uuid FOR UPDATE;
    IF NOT FOUND THEN
      DELETE FROM part_orders WHERE id = v_order_id;
      RETURN jsonb_build_object('ok', false, 'error', 'Invalid product');
    END IF;
    IF NOT v_part.is_active OR v_part.stock < (v_item->>'qty')::int THEN
      DELETE FROM part_orders WHERE id = v_order_id;
      RETURN jsonb_build_object('ok', false, 'error', 'Insufficient stock for ' || v_part.name);
    END IF;

    -- Price stored is GST-inclusive (MRP-style)
    v_line_total := (v_part.price * (v_item->>'qty')::bigint);
    v_line_sub := ROUND(v_line_total::numeric / (1 + v_part.gst_rate / 100.0))::bigint;
    v_line_gst := v_line_total - v_line_sub;

    INSERT INTO part_order_items (order_id, part_id, seller_id, qty, unit_price, gst_rate, line_subtotal, line_gst, line_total)
    VALUES (v_order_id, v_part.id, v_part.seller_id, (v_item->>'qty')::int, v_part.price, v_part.gst_rate, v_line_sub, v_line_gst, v_line_total);

    UPDATE parts SET stock = stock - (v_item->>'qty')::int, updated_at = NOW() WHERE id = v_part.id;

    v_sub := v_sub + v_line_sub;
    v_gst := v_gst + v_line_gst;
    v_total := v_total + v_line_total;
  END LOOP;

  v_inv := public.next_part_invoice_number();
  v_snap := jsonb_build_object(
    'subtotal', v_sub,
    'gst_total', v_gst,
    'grand_total', v_total,
    'gst_rate_note', 'GST inclusive breakdown per line'
  );

  UPDATE part_orders
  SET subtotal = v_sub, gst_total = v_gst, grand_total = v_total,
      invoice_number = v_inv, invoice_snapshot = v_snap, status = 'confirmed', updated_at = NOW()
  WHERE id = v_order_id;

  RETURN jsonb_build_object('ok', true, 'order_id', v_order_id, 'invoice_number', v_inv, 'grand_total', v_total);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_part_order TO authenticated;

INSERT INTO storage.buckets (id, name, public)
VALUES ('part-images', 'part-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS part_images_public ON storage.objects;
CREATE POLICY part_images_public ON storage.objects FOR SELECT USING (bucket_id = 'part-images');

DROP POLICY IF EXISTS part_images_seller ON storage.objects;
CREATE POLICY part_images_seller ON storage.objects FOR ALL USING (
  bucket_id = 'part-images' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin())
);
