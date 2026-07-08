/*
# Fix reservation_venues.facility_id nullability

The ReservationForm allows selecting venues by name from DEPARTMENT_VENUES,
but not all venue names exist in the facilities table. The form inserts
facility_id: facilityData?.id || null, but the column is NOT NULL.
This makes facility_id nullable and adds a venue_name column to store
the selected venue name directly.
*/

-- Add venue_name column to store the original venue name
ALTER TABLE reservation_venues ADD COLUMN IF NOT EXISTS venue_name text;

-- Make facility_id nullable (was NOT NULL)
ALTER TABLE reservation_venues ALTER COLUMN facility_id DROP NOT NULL;

-- Backfill venue_name from facilities join for existing rows
UPDATE reservation_venues rv
SET venue_name = f.name
FROM facilities f
WHERE rv.facility_id = f.id AND rv.venue_name IS NULL;
