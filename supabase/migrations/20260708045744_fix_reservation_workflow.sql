/*
# Fix Reservation Workflow

1. Expand reservations.status CHECK to include 'reviewed' and 'processing'
2. Expand approvals.action CHECK to include all workflow actions
3. Add trigger to auto-create approval record + notification on reservation insert
4. Add trigger to auto-complete approved reservations after event end time
5. Add notification trigger on reservation status change
*/

-- 1. Expand reservations status constraint
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_status_check;
ALTER TABLE reservations ADD CONSTRAINT reservations_status_check
  CHECK (status IN ('pending', 'reviewed', 'processing', 'approved', 'rejected', 'revision_requested', 'cancelled', 'completed'));

-- 2. Expand approvals action constraint
ALTER TABLE approvals DROP CONSTRAINT IF EXISTS approvals_action_check;
ALTER TABLE approvals ADD CONSTRAINT approvals_action_check
  CHECK (action IN ('submitted', 'reviewed', 'processing', 'approved', 'rejected', 'revision_requested', 'completed'));

-- 3. Function to auto-create approval record + notification on new reservation
CREATE OR REPLACE FUNCTION public.handle_new_reservation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create initial approval record with 'submitted' action
  INSERT INTO approvals (reservation_id, approver_id, action, comments)
  VALUES (NEW.id, NULL, 'submitted', 'Reservation submitted for review');

  -- Create notification for the reservation owner
  INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
  VALUES (
    NEW.user_id,
    'Reservation Submitted',
    'Your reservation "' || NEW.activity_name || '" has been submitted and is awaiting review.',
    'info',
    NEW.id,
    'reservation'
  );

  RETURN NEW;
END;
$$;

-- Drop old trigger if exists, create new one
DROP TRIGGER IF EXISTS on_reservation_created ON reservations;
CREATE TRIGGER on_reservation_created
  AFTER INSERT ON reservations
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_reservation();

-- 4. Function to auto-complete approved reservations after event end time
-- This runs on every UPDATE; if status is 'approved' and the event has ended,
-- it transitions to 'completed'
CREATE OR REPLACE FUNCTION public.auto_complete_reservations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_end_time timestamptz;
  v_venue_end timestamptz;
BEGIN
  -- Only auto-complete if status is 'approved' (not on other status changes)
  IF NEW.status = 'approved' AND OLD.status <> 'approved' THEN
    -- Check if the event has already ended
    -- Use egress_date if available, otherwise compute from activity_date + event_duration
    IF NEW.egress_date IS NOT NULL THEN
      v_end_time := NEW.egress_date;
    ELSE
      -- Try to get end time from reservation_venues
      SELECT MAX(end_time) INTO v_venue_end
      FROM reservation_venues
      WHERE reservation_id = NEW.id;

      IF v_venue_end IS NOT NULL THEN
        v_end_time := v_venue_end;
      ELSE
        -- Fall back to activity_date + event_duration hours
        v_end_time := NEW.activity_date::timestamz + (NEW.event_duration || ' hours')::interval;
      END IF;
    END IF;

    -- If the event has already ended, auto-complete
    IF v_end_time < now() THEN
      NEW.status := 'completed';

      -- Create approval record for the auto-completion
      INSERT INTO approvals (reservation_id, approver_id, action, comments)
      VALUES (NEW.id, NULL, 'completed', 'Automatically completed: event has concluded');

      -- Create notification
      INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
      VALUES (
        NEW.user_id,
        'Reservation Completed',
        'Your reservation "' || NEW.activity_name || '" has been completed. The event has concluded.',
        'success',
        NEW.id,
        'reservation'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger: auto-complete on UPDATE (before the row is saved)
DROP TRIGGER IF EXISTS on_reservation_update ON reservations;
CREATE TRIGGER on_reservation_update
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION public.auto_complete_reservations();

-- 5. Also auto-complete any existing approved reservations whose events have ended
-- (runs once during migration)
DO $$
DECLARE
  r RECORD;
  v_end_time timestamptz;
  v_venue_end timestamptz;
BEGIN
  FOR r IN SELECT * FROM reservations WHERE status = 'approved' LOOP
    IF r.egress_date IS NOT NULL THEN
      v_end_time := r.egress_date;
    ELSE
      SELECT MAX(end_time) INTO v_venue_end
      FROM reservation_venues
      WHERE reservation_id = r.id;

      IF v_venue_end IS NOT NULL THEN
        v_end_time := v_venue_end;
      ELSE
        v_end_time := r.activity_date::timestamptz + (r.event_duration || ' hours')::interval;
      END IF;
    END IF;

    IF v_end_time < now() THEN
      UPDATE reservations SET status = 'completed' WHERE id = r.id;

      INSERT INTO approvals (reservation_id, approver_id, action, comments)
      VALUES (r.id, NULL, 'completed', 'Automatically completed: event has concluded');

      INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
      VALUES (
        r.user_id,
        'Reservation Completed',
        'Your reservation "' || r.activity_name || '" has been completed. The event has concluded.',
        'success',
        r.id,
        'reservation'
      );
    END IF;
  END LOOP;
END $$;
