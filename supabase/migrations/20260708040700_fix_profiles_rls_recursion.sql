/*
# Fix Profiles RLS Recursion

The `select_all_profiles_admin` policy queries `profiles` inside a SELECT policy
on `profiles` itself, causing infinite recursion. PostgreSQL blocks ALL queries
on the table, including the auth context's fetchProfile call, which breaks login.

Fix: Drop the recursive policy. Replace with a non-recursive approach using
a SECURITY DEFINER function that checks admin role without triggering RLS.
*/

-- Drop the recursive policy
DROP POLICY IF EXISTS "select_all_profiles_admin" ON profiles;

-- Create a SECURITY DEFINER function to check if current user is admin
-- This bypasses RLS on profiles, avoiding recursion
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Recreate the admin SELECT policy using the non-recursive function
CREATE POLICY "select_all_profiles_admin" ON profiles FOR SELECT
  TO authenticated USING (public.is_current_user_admin());
