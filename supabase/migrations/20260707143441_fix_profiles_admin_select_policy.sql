/*
# Fix Profiles RLS: Allow Admins to View All Users

The existing `select_own_profile` policy only allows users to see their own profile.
This prevents admins from viewing the full user list on the Users management page.

Add a new policy allowing admins to SELECT all profiles.
*/

DROP POLICY IF EXISTS "select_all_profiles_admin" ON profiles;
CREATE POLICY "select_all_profiles_admin" ON profiles FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
