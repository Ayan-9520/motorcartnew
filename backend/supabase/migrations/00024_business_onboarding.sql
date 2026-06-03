-- Business onboarding: pending approval for business signups, profile tracking in metadata

DO $$ BEGIN
  CREATE TYPE onboarding_status AS ENUM (
    'not_started',
    'in_progress',
    'submitted',
    'approved',
    'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE approval_status AS ENUM (
    'pending',
    'under_review',
    'approved',
    'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarding_status TEXT NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS profile_completion SMALLINT NOT NULL DEFAULT 0
    CHECK (profile_completion >= 0 AND profile_completion <= 100);

COMMENT ON COLUMN public.users.onboarding_status IS 'Onboarding pipeline stage (mirrors metadata.business)';
COMMENT ON COLUMN public.users.approval_status IS 'Admin approval for business accounts';
COMMENT ON COLUMN public.users.profile_completion IS '0-100 profile completeness score';

-- Business signups start as pending_verification until admin approves
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
  v_business_signup BOOLEAN;
  v_status user_status;
  v_company TEXT;
  v_city TEXT;
  v_state TEXT;
BEGIN
  v_full_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), 'User');
  v_avatar := NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_url'), '');
  v_company := NULLIF(TRIM(NEW.raw_user_meta_data->>'company_name'), '');
  v_city := NULLIF(TRIM(NEW.raw_user_meta_data->>'city'), '');
  v_state := NULLIF(TRIM(NEW.raw_user_meta_data->>'state'), '');

  BEGIN
    v_role := COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), '')::public.app_role,
      'customer'::public.app_role
    );
  EXCEPTION WHEN OTHERS THEN
    v_role := 'customer'::public.app_role;
  END;

  v_business_signup := COALESCE((NEW.raw_user_meta_data->>'business_signup')::BOOLEAN, FALSE);

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

  v_status := 'active'::user_status;
  IF v_business_signup AND v_role IN (
    'dealer', 'used_car_dealer', 'new_car_dealer',
    'dsa_agent', 'parts_seller', 'service_center'
  ) THEN
    v_status := 'pending_verification'::user_status;
  END IF;

  INSERT INTO public.users (
    id, email, phone, full_name, role, avatar_url, status,
    company_name, city, state,
    onboarding_status, approval_status, profile_completion,
    metadata
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_phone,
    v_full_name,
    v_role,
    v_avatar,
    v_status,
    v_company,
    v_city,
    v_state,
    CASE WHEN v_business_signup THEN 'submitted' ELSE 'not_started' END,
    CASE WHEN v_business_signup THEN 'pending' ELSE 'approved' END,
    CASE WHEN v_business_signup THEN 40 ELSE 0 END,
    '{}'::JSONB
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
    status = EXCLUDED.status,
    company_name = COALESCE(EXCLUDED.company_name, public.users.company_name),
    city = COALESCE(EXCLUDED.city, public.users.city),
    state = COALESCE(EXCLUDED.state, public.users.state),
    updated_at = NOW();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_auth_user failed for %: %', NEW.id, SQLERRM;
  RAISE;
END;
$$;
