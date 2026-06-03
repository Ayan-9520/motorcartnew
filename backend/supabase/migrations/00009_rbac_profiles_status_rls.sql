-- =============================================================================
-- RBAC: super_admin role, account status, profiles view,
--       hardened finance/bookings RLS (DSA + service partners).
-- Prerequisite: 00009a_app_role_super_admin.sql (enum value must be committed first).
-- (service_technician enum value is added in 00006_automotive_services.sql)
-- Public profile table remains `users` (single source of truth). `profiles`
-- is a compatibility view matching product naming.
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM (
    'active',
    'suspended',
    'pending_verification',
    'closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS status user_status NOT NULL DEFAULT 'active';

-- Legacy Supabase/starter projects may have public.profiles as a TABLE.
-- CREATE OR REPLACE VIEW fails with 42809 ("profiles" is not a view) — drop table first.
DO $$
DECLARE
  rel_kind "char";
BEGIN
  SELECT c.relkind INTO rel_kind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'profiles';

  IF rel_kind = 'r' THEN
    DROP TABLE public.profiles CASCADE;
  END IF;
END $$;

-- Compatibility view (same row as public.users)
CREATE OR REPLACE VIEW public.profiles AS
SELECT
  id,
  email,
  full_name,
  phone,
  role,
  avatar_url,
  status,
  is_verified,
  created_at,
  updated_at
FROM public.users;

GRANT SELECT ON public.profiles TO authenticated, service_role;

-- Elevated staff check (used across RLS helper)
-- role::text avoids 55P04 if enum was just added in a prior migration in same session
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role::text IN ('admin', 'super_admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Signup trigger — see 00022_signup_auth_trigger_fix.sql for canonical version

-- Finance: customer + assigned DSA + staff
DROP POLICY IF EXISTS finance_own ON public.finance_applications;
CREATE POLICY finance_access ON public.finance_applications
FOR ALL
USING (
  user_id = auth.uid()
  OR public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.dsa_agents da
    WHERE da.id = finance_applications.dsa_agent_id
      AND da.user_id = auth.uid()
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.dsa_agents da
    WHERE da.id = finance_applications.dsa_agent_id
      AND da.user_id = auth.uid()
  )
);

-- Bookings: customer + owning service center + staff
DROP POLICY IF EXISTS bookings_own ON public.bookings;
CREATE POLICY bookings_access ON public.bookings
FOR ALL
USING (
  user_id = auth.uid()
  OR public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.service_centers sc
    WHERE sc.id = bookings.service_center_id
      AND sc.owner_id = auth.uid()
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.service_centers sc
    WHERE sc.id = bookings.service_center_id
      AND sc.owner_id = auth.uid()
  )
);
