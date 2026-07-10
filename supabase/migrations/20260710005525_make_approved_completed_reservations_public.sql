/*
# Public Visibility for Approved & Completed Reservations

1. Security Changes (RLS)
   - Modify the `select_own_reservations` SELECT policy on the `reservations` table
     so that ALL authenticated users can view reservations with status
     'approved' or 'completed', regardless of who created them.
   - Users still see their own reservations in ALL statuses.
   - Admins and faculty continue to see all reservations.
   - Pending, Reviewed, Processing, Revision Requested, Rejected, and Cancelled
     reservations remain visible only to the owner, admins, and faculty.

2. Important Notes
   - The same centralized `reservations` table remains the single source of truth.
   - No separate public dataset is created.
   - The faculty check uses `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() ...)`
     which reads the caller's OWN profile row — no RLS recursion risk.
   - The admin check uses the existing `is_current_user_admin()` SECURITY DEFINER
     function to avoid recursion on the profiles table.
*/

DROP POLICY IF EXISTS "select_own_reservations" ON reservations;
CREATE POLICY "select_own_reservations" ON reservations FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR public.is_current_user_admin()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'faculty'
    )
    OR status IN ('approved', 'completed')
  );
