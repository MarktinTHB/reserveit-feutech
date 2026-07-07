/*
# Demo Admin Account Setup

1. Set a known password for the existing auth user svtabelisma@fit.edu.ph
2. Promote their profile role to admin
3. Create a secure admin-only function to promote other users to admin
*/

-- 1. Set password for the demo admin account
UPDATE auth.users
SET encrypted_password = crypt('Admin@123456', gen_salt('bf')),
    email_confirmed_at = now(),
    updated_at = now()
WHERE email = 'svtabelisma@fit.edu.ph';

-- 2. Promote to admin role
UPDATE profiles
SET role = 'admin',
    updated_at = now()
WHERE email = 'svtabelisma@fit.edu.ph';

-- 3. Create secure admin-only function to promote users to any role
-- This function checks that the caller is an admin before allowing role changes
CREATE OR REPLACE FUNCTION public.set_user_role(target_user_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Permission denied: only admins can change user roles';
  END IF;

  -- Validate the new role
  IF new_role NOT IN ('student', 'officer', 'faculty', 'admin') THEN
    RAISE EXCEPTION 'Invalid role: must be student, officer, faculty, or admin';
  END IF;

  -- Update the target user's role
  UPDATE profiles
  SET role = new_role, updated_at = now()
  WHERE id = target_user_id;
END;
$$;

-- Revoke public execute, grant only to authenticated
REVOKE EXECUTE ON FUNCTION public.set_user_role(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, text) TO authenticated;
