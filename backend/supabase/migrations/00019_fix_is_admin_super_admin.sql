-- Quick fix if 00009 failed with: unsafe use of new value "super_admin" (55P04)
-- Step 1: Run this file alone → click Run → wait for success.
-- Step 2: Re-run 00009 from the profiles/view section onward, or run full 00009 again.

ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'super_admin';

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role::text IN ('admin', 'super_admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
