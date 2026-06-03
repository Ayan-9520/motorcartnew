-- =============================================================================
-- MOTORCART — Real-time Auction System (Phase 3)
-- =============================================================================

-- Extend auctions
ALTER TABLE public.auctions ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE public.auctions ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.auctions ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.auctions ADD COLUMN IF NOT EXISTS viewer_count INT NOT NULL DEFAULT 0;
ALTER TABLE public.auctions ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_auctions_type ON public.auctions(auction_type);
CREATE INDEX IF NOT EXISTS idx_auctions_slug ON public.auctions(slug);
CREATE INDEX IF NOT EXISTS idx_auctions_featured ON public.auctions(is_featured) WHERE is_featured = TRUE;

-- Auction chat messages
CREATE TABLE IF NOT EXISTS public.auction_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL DEFAULT 'Bidder',
  message TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auction_messages_auction ON public.auction_messages(auction_id, created_at DESC);

-- Auto-bid limits
CREATE TABLE IF NOT EXISTS public.auction_auto_bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  max_amount BIGINT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(auction_id, bidder_id)
);

CREATE INDEX IF NOT EXISTS idx_auto_bids_auction ON public.auction_auto_bids(auction_id) WHERE is_active = TRUE;

-- Bid rate limiting log
CREATE TABLE IF NOT EXISTS public.auction_bid_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  rejection_reason TEXT,
  risk_score INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bid_attempts_recent ON public.auction_bid_attempts(bidder_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- Secure bid placement (anti-spam + validation)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.place_auction_bid(
  p_auction_id UUID,
  p_amount BIGINT,
  p_is_auto_bid BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_auction RECORD;
  v_min_bid BIGINT;
  v_recent_count INT;
  v_last_bid BIGINT;
  v_risk INT := 0;
  v_bid_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Authentication required');
  END IF;

  SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Auction not found');
  END IF;

  IF v_auction.status <> 'live' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Auction is not live');
  END IF;

  IF NOW() < v_auction.starts_at OR NOW() > v_auction.ends_at THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Auction is outside bidding window');
  END IF;

  v_min_bid := COALESCE(v_auction.current_bid, v_auction.starting_bid) + v_auction.bid_increment;
  IF p_amount < v_min_bid THEN
    RETURN jsonb_build_object('ok', false, 'error', format('Minimum bid is ₹%s', v_min_bid));
  END IF;

  -- Anti-spam: max 8 bids per 60 seconds per user per auction
  SELECT COUNT(*) INTO v_recent_count
  FROM auction_bid_attempts
  WHERE auction_id = p_auction_id AND bidder_id = v_user_id
    AND created_at > NOW() - INTERVAL '60 seconds';

  IF v_recent_count >= 8 THEN
    INSERT INTO auction_bid_attempts (auction_id, bidder_id, amount, success, rejection_reason, risk_score)
    VALUES (p_auction_id, v_user_id, p_amount, false, 'rate_limit', 50);
    RETURN jsonb_build_object('ok', false, 'error', 'Too many bids. Please wait a moment.');
  END IF;

  -- Fraud: large jump from user's last bid
  SELECT amount INTO v_last_bid FROM bids
  WHERE auction_id = p_auction_id AND bidder_id = v_user_id
  ORDER BY created_at DESC LIMIT 1;

  IF v_last_bid IS NOT NULL AND p_amount > v_last_bid * 1.5 THEN
    v_risk := v_risk + 30;
  END IF;

  IF p_amount > COALESCE(v_auction.current_bid, v_auction.starting_bid) * 2 THEN
    v_risk := v_risk + 25;
  END IF;

  IF v_risk >= 50 THEN
    INSERT INTO auction_bid_attempts (auction_id, bidder_id, amount, success, rejection_reason, risk_score)
    VALUES (p_auction_id, v_user_id, p_amount, false, 'fraud_review', v_risk);
    RETURN jsonb_build_object('ok', false, 'error', 'Bid flagged for review. Contact support.');
  END IF;

  INSERT INTO bids (auction_id, bidder_id, amount, is_auto_bid)
  VALUES (p_auction_id, v_user_id, p_amount, p_is_auto_bid)
  RETURNING id INTO v_bid_id;

  INSERT INTO auction_bid_attempts (auction_id, bidder_id, amount, success, risk_score)
  VALUES (p_auction_id, v_user_id, p_amount, true, v_risk);

  INSERT INTO auction_messages (auction_id, user_id, display_name, message, is_system)
  VALUES (p_auction_id, v_user_id, 'Bidder', format('New bid: ₹%s', p_amount), true);

  RETURN jsonb_build_object(
    'ok', true,
    'bid_id', v_bid_id,
    'amount', p_amount,
    'risk_score', v_risk
  );
END;
$$;

-- Set auto-bid max
CREATE OR REPLACE FUNCTION public.set_auction_auto_bid(
  p_auction_id UUID,
  p_max_amount BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_auction RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Authentication required');
  END IF;

  SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id;
  IF v_auction.status <> 'live' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Auction not live');
  END IF;

  IF p_max_amount < COALESCE(v_auction.current_bid, v_auction.starting_bid) + v_auction.bid_increment THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Max amount too low');
  END IF;

  INSERT INTO auction_auto_bids (auction_id, bidder_id, max_amount, is_active)
  VALUES (p_auction_id, v_user_id, p_max_amount, true)
  ON CONFLICT (auction_id, bidder_id) DO UPDATE SET
    max_amount = EXCLUDED.max_amount,
    is_active = true,
    updated_at = NOW();

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- RLS auction_messages
ALTER TABLE public.auction_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auction_messages_read ON public.auction_messages;
CREATE POLICY auction_messages_read ON public.auction_messages FOR SELECT USING (true);
DROP POLICY IF EXISTS auction_messages_insert ON public.auction_messages;
CREATE POLICY auction_messages_insert ON public.auction_messages FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR is_system = false));

ALTER TABLE public.auction_auto_bids ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auto_bids_own ON public.auction_auto_bids;
CREATE POLICY auto_bids_own ON public.auction_auto_bids FOR ALL USING (bidder_id = auth.uid());

-- Bids: use RPC for insert; keep select public
DROP POLICY IF EXISTS bids_insert_auth ON public.bids;
CREATE POLICY bids_insert_auth ON public.bids FOR INSERT WITH CHECK (false);

-- Realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.auctions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
