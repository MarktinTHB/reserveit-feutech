/*
# Fix Approvals RLS: Add UPDATE policy

The approvals table has no UPDATE policy, meaning no client can update
approval records. Add a policy allowing admins and faculty to update.
*/

DROP POLICY IF EXISTS "update_approvals" ON approvals;
CREATE POLICY "update_approvals" ON approvals FOR UPDATE
  TO authenticated USING (public.is_current_user_admin() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'faculty'
  ));
