-- Fix 1: Make reservation-documents bucket public so getPublicUrl() works
-- The bucket was created with public=false but the app uses getPublicUrl() which requires public=true
UPDATE storage.buckets SET public = true WHERE id = 'reservation-documents';

-- Fix 2: Create function to automatically transition approved reservations to completed
-- once their scheduled event end time has passed
CREATE OR REPLACE FUNCTION mark_completed_reservations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE reservations r
  SET status = 'completed', updated_at = now()
  WHERE r.status = 'approved'
    AND (
      -- Reservation has venues: use the latest end_time
      (
        EXISTS (
          SELECT 1 FROM reservation_venues rv WHERE rv.reservation_id = r.id
        )
        AND (
          SELECT MAX(rv.end_time)
          FROM reservation_venues rv
          WHERE rv.reservation_id = r.id
        ) <= now()
      )
      OR
      -- Reservation has no venues: fall back to activity_date + event_duration hours
      (
        NOT EXISTS (
          SELECT 1 FROM reservation_venues rv WHERE rv.reservation_id = r.id
        )
        AND (r.activity_date::timestamp + (r.event_duration || ' hours')::interval) <= now()
      )
    );
END;
$$;

-- Grant execute to authenticated users so the frontend can call it via RPC
GRANT EXECUTE ON FUNCTION mark_completed_reservations() TO authenticated;
