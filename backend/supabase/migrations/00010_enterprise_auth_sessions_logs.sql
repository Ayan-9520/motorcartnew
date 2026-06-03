-- =============================================================================
-- Enterprise auth layer: user_roles (primary mirror), device_sessions,
-- activity_logs. Canonical profile row remains public.users; public.profiles
-- stays a VIEW (see 00009) — do not duplicate profile columns here.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- user_roles — primary role synced from users.role (multi-role ready later)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_primary ON public.user_roles(user_id) WHERE is_primary = TRUE;

CREATE OR REPLACE FUNCTION public.sync_user_roles_primary()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.user_roles WHERE user_id = NEW.id AND is_primary = TRUE;
  INSERT INTO public.user_roles (user_id, role, is_primary)
  VALUES (NEW.id, NEW.role, TRUE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill from existing users (before trigger attaches — avoids redundant work on migrate)
INSERT INTO public.user_roles (user_id, role, is_primary)
SELECT id, role, TRUE FROM public.users
ON CONFLICT (user_id, role) DO UPDATE SET is_primary = EXCLUDED.is_primary;

DROP TRIGGER IF EXISTS tr_users_sync_user_roles ON public.users;
CREATE TRIGGER tr_users_sync_user_roles
  AFTER INSERT OR UPDATE OF role ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_roles_primary();

-- -----------------------------------------------------------------------------
-- device_sessions — app-level device touchpoints (no refresh tokens stored)
-- -----------------------------------------------------------------------------
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
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.device_sessions (user_id, device_key, user_agent, last_seen_at)
  VALUES (
    auth.uid(),
    left(p_device_key, 128),
    left(COALESCE(p_user_agent, ''), 512),
    NOW()
  )
  ON CONFLICT (user_id, device_key) DO UPDATE SET
    last_seen_at = NOW(),
    user_agent = EXCLUDED.user_agent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.register_device_session(TEXT, TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- activity_logs — auth & product audit trail (extend metadata as needed)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
CREATE POLICY user_roles_select_own ON public.user_roles FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS device_sessions_select_own ON public.device_sessions;
CREATE POLICY device_sessions_select_own ON public.device_sessions FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS activity_logs_insert_own ON public.activity_logs;
CREATE POLICY activity_logs_insert_own ON public.activity_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS activity_logs_select_own ON public.activity_logs;
CREATE POLICY activity_logs_select_own ON public.activity_logs FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

COMMENT ON TABLE public.user_roles IS 'Role assignments; primary row mirrors users.role.';
COMMENT ON TABLE public.device_sessions IS 'Per-device last seen; no token material stored.';
COMMENT ON TABLE public.activity_logs IS 'User-scoped activity stream for compliance & support.';
