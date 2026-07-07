/*
# Security Fix Migration

1. Function Security
- Fix `public.update_updated_at_column` to use an immutable search_path by setting it explicitly.

2. RLS Policy Fixes
- `notifications`: The `insert_notifications` policy allowed unrestricted INSERT. Fixed to restrict to the owner (`user_id`).
- `reservation_documents`: The `insert_reservation_documents` and `delete_reservation_documents` policies allowed unrestricted access. Fixed to restrict to the reservation owner via a join.
- `reservation_equipment`: The `insert_reservation_equipment`, `update_reservation_equipment`, and `delete_reservation_equipment` policies allowed unrestricted access. Fixed to restrict to the reservation owner via a join.
- `reservation_venues`: The `insert_reservation_venues`, `update_reservation_venues`, and `delete_reservation_venues` policies allowed unrestricted access. Fixed to restrict to the reservation owner via a join.
*/

-- 1. Fix mutable search_path on the update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Fix notifications insert policy
DROP POLICY IF EXISTS "insert_notifications" ON notifications;
CREATE POLICY "insert_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- 3. Fix reservation_documents policies
DROP POLICY IF EXISTS "insert_reservation_documents" ON reservation_documents;
CREATE POLICY "insert_reservation_documents" ON reservation_documents FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM reservations
      WHERE reservations.id = reservation_documents.reservation_id
      AND reservations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_reservation_documents" ON reservation_documents;
CREATE POLICY "delete_reservation_documents" ON reservation_documents FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM reservations
      WHERE reservations.id = reservation_documents.reservation_id
      AND reservations.user_id = auth.uid()
    )
  );

-- 4. Fix reservation_equipment policies
DROP POLICY IF EXISTS "insert_reservation_equipment" ON reservation_equipment;
CREATE POLICY "insert_reservation_equipment" ON reservation_equipment FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM reservations
      WHERE reservations.id = reservation_equipment.reservation_id
      AND reservations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_reservation_equipment" ON reservation_equipment;
CREATE POLICY "update_reservation_equipment" ON reservation_equipment FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM reservations
      WHERE reservations.id = reservation_equipment.reservation_id
      AND reservations.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM reservations
      WHERE reservations.id = reservation_equipment.reservation_id
      AND reservations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_reservation_equipment" ON reservation_equipment;
CREATE POLICY "delete_reservation_equipment" ON reservation_equipment FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM reservations
      WHERE reservations.id = reservation_equipment.reservation_id
      AND reservations.user_id = auth.uid()
    )
  );

-- 5. Fix reservation_venues policies
DROP POLICY IF EXISTS "insert_reservation_venues" ON reservation_venues;
CREATE POLICY "insert_reservation_venues" ON reservation_venues FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM reservations
      WHERE reservations.id = reservation_venues.reservation_id
      AND reservations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_reservation_venues" ON reservation_venues;
CREATE POLICY "update_reservation_venues" ON reservation_venues FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM reservations
      WHERE reservations.id = reservation_venues.reservation_id
      AND reservations.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM reservations
      WHERE reservations.id = reservation_venues.reservation_id
      AND reservations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_reservation_venues" ON reservation_venues;
CREATE POLICY "delete_reservation_venues" ON reservation_venues FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM reservations
      WHERE reservations.id = reservation_venues.reservation_id
      AND reservations.user_id = auth.uid()
    )
  );
