-- =============================================================================
-- MOTORCART — Enterprise auction realtime (bid lock, finalize, notifications)
-- =============================================================================

-- Outbid / winner notifications
CREATE TABLE IF NOT EXISTS public.auction_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('outbid', 'winning', 'won', 'reserve_met', 'auction_ended', 'system')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auction_notifications_user
  ON public.auction_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auction_notifications_auction
  ON public.auction_notifications(auction_id, created_at DESC);

ALTER TABLE public.auction_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auction_notifications_own ON public.auction_notifications;
CREATE POLICY auction_notifications_own ON public.auction_notifications
  FOR SELECT USING (user_id = auth.uid());
-- Notifications created only via SECURITY DEFINER RPC/triggers (no client insert)
DROP POLICY IF EXISTS auction_notifications_insert ON public.auction_notifications;

-- -----------------------------------------------------------------------------
-- Bid placement with row lock + anti-snipe extension
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
  v_prev_leader UUID;
  v_risk INT := 0;
  v_bid_id UUID;
  v_bidder_name TEXT;
  v_extend BOOLEAN := FALSE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Authentication required');
  END IF;

  -- Per-auction advisory lock (bid locking)
  PERFORM pg_advisory_xact_lock(hashtext('auction_bid_' || p_auction_id::text));

  SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Auction not found');
  END IF;

  IF v_auction.status <> 'live' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Auction is not live');
  END IF;

  IF NOW() < v_auction.starts_at THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Auction has not started');
  END IF;

  IF NOW() > v_auction.ends_at THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Auction has ended');
  END IF;

  v_min_bid := COALESCE(v_auction.current_bid, v_auction.starting_bid) + v_auction.bid_increment;
  IF p_amount < v_min_bid THEN
    RETURN jsonb_build_object('ok', false, 'error', format('Minimum bid is ₹%s', v_min_bid));
  END IF;

  SELECT COUNT(*) INTO v_recent_count
  FROM auction_bid_attempts
  WHERE auction_id = p_auction_id AND bidder_id = v_user_id
    AND created_at > NOW() - INTERVAL '60 seconds';

  IF v_recent_count >= 8 THEN
    INSERT INTO auction_bid_attempts (auction_id, bidder_id, amount, success, rejection_reason, risk_score)
    VALUES (p_auction_id, v_user_id, p_amount, false, 'rate_limit', 50);
    RETURN jsonb_build_object('ok', false, 'error', 'Too many bids. Please wait a moment.');
  END IF;

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

  -- Previous high bidder (for outbid notification)
  SELECT bidder_id INTO v_prev_leader
  FROM bids
  WHERE auction_id = p_auction_id
  ORDER BY amount DESC, created_at DESC
  LIMIT 1;

  SELECT COALESCE(full_name, 'Bidder') INTO v_bidder_name FROM users WHERE id = v_user_id;

  INSERT INTO bids (auction_id, bidder_id, amount, is_auto_bid)
  VALUES (p_auction_id, v_user_id, p_amount, p_is_auto_bid)
  RETURNING id INTO v_bid_id;

  INSERT INTO auction_bid_attempts (auction_id, bidder_id, amount, success, risk_score)
  VALUES (p_auction_id, v_user_id, p_amount, true, v_risk);

  -- Anti-snipe: extend 2 minutes if bid in final 2 minutes
  IF v_auction.ends_at - NOW() < INTERVAL '2 minutes' THEN
    v_extend := TRUE;
    UPDATE auctions SET ends_at = ends_at + INTERVAL '2 minutes', updated_at = NOW()
    WHERE id = p_auction_id;
  END IF;

  INSERT INTO auction_messages (auction_id, user_id, display_name, message, is_system)
  VALUES (p_auction_id, v_user_id, v_bidder_name, format('New bid: ₹%s', p_amount), true);

  -- Outbid notification for previous leader
  IF v_prev_leader IS NOT NULL AND v_prev_leader <> v_user_id THEN
    INSERT INTO auction_notifications (auction_id, user_id, kind, title, body, payload)
    VALUES (
      p_auction_id,
      v_prev_leader,
      'outbid',
      'You have been outbid',
      format('New leading bid: ₹%s', p_amount),
      jsonb_build_object('amount', p_amount, 'bid_id', v_bid_id)
    );
  END IF;

  -- Reserve met notification (once)
  IF v_auction.reserve_price IS NOT NULL
     AND p_amount >= v_auction.reserve_price
     AND COALESCE(v_auction.current_bid, 0) < v_auction.reserve_price THEN
    INSERT INTO auction_notifications (auction_id, user_id, kind, title, body)
    SELECT p_auction_id, organizer_id, 'reserve_met', 'Reserve price met', format('Current bid ₹%s meets reserve', p_amount)
    FROM auctions WHERE id = p_auction_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'bid_id', v_bid_id,
    'amount', p_amount,
    'bidder_id', v_user_id,
    'bidder_name', v_bidder_name,
    'risk_score', v_risk,
    'extended', v_extend
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- Finalize auction & declare winner
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalize_auction(p_auction_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auction RECORD;
  v_winner_id UUID;
  v_winning_amount BIGINT;
  v_reserve_ok BOOLEAN;
BEGIN
  SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Auction not found');
  END IF;

  IF v_auction.status = 'ended' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already_finalized', true,
      'winner_id', v_auction.winner_id,
      'winning_amount', v_auction.current_bid
    );
  END IF;

  SELECT bidder_id, amount INTO v_winner_id, v_winning_amount
  FROM bids
  WHERE auction_id = p_auction_id
  ORDER BY amount DESC, created_at ASC
  LIMIT 1;

  v_reserve_ok := v_auction.reserve_price IS NULL
    OR (v_winning_amount IS NOT NULL AND v_winning_amount >= v_auction.reserve_price);

  IF NOT v_reserve_ok THEN
    v_winner_id := NULL;
  END IF;

  UPDATE auctions
  SET
    status = 'ended',
    winner_id = v_winner_id,
    updated_at = NOW()
  WHERE id = p_auction_id;

  INSERT INTO auction_messages (auction_id, display_name, message, is_system)
  VALUES (
    p_auction_id,
    'System',
    CASE
      WHEN v_winner_id IS NOT NULL THEN format('Auction closed. Winner declared at ₹%s', v_winning_amount)
      WHEN v_auction.reserve_price IS NOT NULL THEN 'Auction closed. Reserve not met — no sale.'
      ELSE 'Auction closed with no qualifying bids.'
    END,
    true
  );

  IF v_winner_id IS NOT NULL THEN
    INSERT INTO auction_notifications (auction_id, user_id, kind, title, body, payload)
    VALUES (
      p_auction_id,
      v_winner_id,
      'won',
      'You won this auction',
      format('Winning bid: ₹%s', v_winning_amount),
      jsonb_build_object('amount', v_winning_amount)
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'winner_id', v_winner_id,
    'winning_amount', v_winning_amount,
    'reserve_met', v_reserve_ok
  );
END;
$$;

-- Dealer registration from authenticated dealer owner
CREATE OR REPLACE FUNCTION public.register_dealer_auction(
  p_auction_id UUID,
  p_max_bid BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dealer_id UUID;
  v_entry_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Authentication required');
  END IF;

  SELECT id INTO v_dealer_id FROM dealers WHERE owner_id = auth.uid() LIMIT 1;
  IF v_dealer_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Dealer account required');
  END IF;

  INSERT INTO dealer_auction_entries (dealer_id, auction_id, max_bid, status)
  VALUES (v_dealer_id, p_auction_id, p_max_bid, 'registered')
  ON CONFLICT (dealer_id, auction_id) DO UPDATE SET
    max_bid = COALESCE(EXCLUDED.max_bid, dealer_auction_entries.max_bid),
    status = 'registered',
    updated_at = NOW()
  RETURNING id INTO v_entry_id;

  RETURN jsonb_build_object('ok', true, 'entry_id', v_entry_id, 'dealer_id', v_dealer_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_auction(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_dealer_auction(UUID, BIGINT) TO authenticated;

-- Realtime publications
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
