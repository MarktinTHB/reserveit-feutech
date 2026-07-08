/*
# Fix Nested Query Relationships

Root cause: The Reservations and Approvals pages use nested Supabase queries
that embed `profiles(full_name, email)` and `approvals(*, approver:profiles(full_name))`.
However, `reservations.user_id` and `approvals.approver_id` have FKs to `auth.users.id`,
NOT to `profiles.id`. PostgREST cannot resolve the relationship to `profiles` without
a FK, so the entire nested query fails silently and returns an empty result.

Fix: Add foreign keys from `reservations.user_id` → `profiles.id` and
`approvals.approver_id` → `profiles.id`. Since `profiles.id` already references
`auth.users.id` (ON DELETE CASCADE), these FKs create valid join paths for PostgREST.
*/

-- Add FK from reservations.user_id to profiles.id
ALTER TABLE reservations
  ADD CONSTRAINT reservations_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add FK from approvals.approver_id to profiles.id (nullable, so SET NULL on delete)
ALTER TABLE approvals
  ADD CONSTRAINT approvals_approver_id_profiles_fkey
  FOREIGN KEY (approver_id) REFERENCES profiles(id) ON DELETE SET NULL;
