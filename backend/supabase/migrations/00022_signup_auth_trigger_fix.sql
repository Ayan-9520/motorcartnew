-- Fix "Database error saving new user" on signup
-- Causes: missing status column, phone from metadata not auth.phone, role cast, duplicate phone

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

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
  v_phone TEXT;
  v_full_name TEXT;
  v_avatar TEXT;
BEGIN
  v_full_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), 'User');
  v_avatar := NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_url'), '');

  BEGIN
    v_role := COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), '')::public.app_role,
      'customer'::public.app_role
    );
  EXCEPTION WHEN OTHERS THEN
    v_role := 'customer'::public.app_role;
  END;

  v_phone := NULLIF(
    TRIM(COALESCE(
      NEW.raw_user_meta_data->>'phone',
      NEW.phone::TEXT,
      ''
    )),
    ''
  );

  IF v_phone IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.users u WHERE u.phone = v_phone AND u.id IS DISTINCT FROM NEW.id
  ) THEN
    v_phone := NULL;
  END IF;

  INSERT INTO public.users (id, email, phone, full_name, role, avatar_url, status)
  VALUES (
    NEW.id,
    NEW.email,
    v_phone,
    v_full_name,
    v_role,
    v_avatar,
    'active'::user_status
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    phone = COALESCE(EXCLUDED.phone, public.users.phone),
    full_name = CASE
      WHEN COALESCE(NULLIF(EXCLUDED.full_name, ''), NULL) IS NOT NULL THEN EXCLUDED.full_name
      ELSE public.users.full_name
    END,
    role = EXCLUDED.role,
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    updated_at = NOW();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_auth_user failed for %: %', NEW.id, SQLERRM;
  RAISE;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
