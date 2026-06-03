-- Fix error 42809: "profiles" is not a view
-- Run this if 00009 failed partway: converts legacy profiles TABLE → VIEW over users.

DO $$
DECLARE
  rel_kind "char";
BEGIN
  SELECT c.relkind INTO rel_kind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'profiles';

  IF rel_kind = 'r' THEN
    RAISE NOTICE 'Dropping legacy public.profiles table (canonical data is public.users)';
    DROP TABLE public.profiles CASCADE;
  END IF;
END $$;

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
