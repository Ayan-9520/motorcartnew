-- Ensure device_sessions + register_device_session RPC exist (idempotent fix if 00010 was skipped)

CREATE TABLE IF NOT EXISTS public.device_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  device_key TEXT NOT NULL,
  user_agent TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, device_key)
);

CREATE INDEX IF NOT EXISTS idx_device_sessions_user ON public.device_sessions(user_id);

CREATE OR REPLACE FUNCTION public.register_device_session(p_device_key TEXT, p_user_agent TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.device_sessions (user_id, device_key, user_agent, last_seen_at)
  VALUES (
    auth.uid(),
    left(COALESCE(p_device_key, ''), 128),
    left(COALESCE(p_user_agent, ''), 512),
    NOW()
  )
  ON CONFLICT (user_id, device_key) DO UPDATE SET
    last_seen_at = NOW(),
    user_agent = EXCLUDED.user_agent;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_device_session(TEXT, TEXT) TO authenticated;

ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS device_sessions_select_own ON public.device_sessions;
CREATE POLICY device_sessions_select_own ON public.device_sessions FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS device_sessions_insert_own ON public.device_sessions;
CREATE POLICY device_sessions_insert_own ON public.device_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS device_sessions_update_own ON public.device_sessions;
CREATE POLICY device_sessions_update_own ON public.device_sessions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
