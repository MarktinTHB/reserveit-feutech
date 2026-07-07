/*
# ReserveIt Database Schema Migration

1. New Tables
- `profiles` - Extended user profiles linked to auth.users
- `facilities` - School facilities/venues available for reservation
- `reservations` - Reservation requests with full details
- `reservation_venues` - Junction table for many-to-many venues
- `reservation_equipment` - Equipment requested per reservation
- `reservation_documents` - Supporting documents uploaded
- `approvals` - Approval workflow tracking
- `notifications` - User notification center
- `audit_logs` - System audit trail
- `system_settings` - Application configuration

2. Security
- Enable RLS on all tables
- Owner-scoped policies for user data
- Role-based access for admin functions
*/

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  student_id text,
  department text,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'officer', 'faculty', 'admin')),
  phone text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Facilities table
CREATE TABLE IF NOT EXISTS facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  department text NOT NULL,
  type text NOT NULL,
  capacity integer,
  location text,
  description text,
  amenities text[],
  images text[],
  is_active boolean NOT NULL DEFAULT true,
  requires_approval boolean NOT NULL DEFAULT true,
  min_notice_hours integer DEFAULT 24,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_date timestamptz NOT NULL DEFAULT now(),
  activity_date date NOT NULL,
  activity_name text NOT NULL,
  purpose text NOT NULL,
  department text NOT NULL,
  event_duration integer NOT NULL, -- in hours
  internal_participants integer DEFAULT 0,
  external_participants integer DEFAULT 0,
  security_guards integer DEFAULT 0,
  service_crew integer DEFAULT 0,
  setup_instructions text,
  ingress_date timestamptz,
  egress_date timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revision_requested', 'cancelled', 'completed')),
  total_attendees integer GENERATED ALWAYS AS (internal_participants + external_participants) STORED,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Reservation venues junction
CREATE TABLE IF NOT EXISTS reservation_venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL
);

-- Reservation equipment
CREATE TABLE IF NOT EXISTS reservation_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  equipment_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  notes text
);

-- Reservation documents
CREATE TABLE IF NOT EXISTS reservation_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  uploaded_at timestamptz DEFAULT now()
);

-- Approvals table
CREATE TABLE IF NOT EXISTS approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  approver_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('approved', 'rejected', 'revision_requested')),
  comments text,
  created_at timestamptz DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  related_id uuid,
  related_type text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  table_name text,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Facilities policies (public read, admin write)
DROP POLICY IF EXISTS "select_facilities" ON facilities;
CREATE POLICY "select_facilities" ON facilities FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_facilities" ON facilities;
CREATE POLICY "insert_facilities" ON facilities FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "update_facilities" ON facilities;
CREATE POLICY "update_facilities" ON facilities FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "delete_facilities" ON facilities;
CREATE POLICY "delete_facilities" ON facilities FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Reservations policies
DROP POLICY IF EXISTS "select_own_reservations" ON reservations;
CREATE POLICY "select_own_reservations" ON reservations FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty')));

DROP POLICY IF EXISTS "insert_own_reservations" ON reservations;
CREATE POLICY "insert_own_reservations" ON reservations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_reservations" ON reservations;
CREATE POLICY "update_own_reservations" ON reservations FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty')));

DROP POLICY IF EXISTS "delete_own_reservations" ON reservations;
CREATE POLICY "delete_own_reservations" ON reservations FOR DELETE
  TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Reservation venues policies
DROP POLICY IF EXISTS "select_reservation_venues" ON reservation_venues;
CREATE POLICY "select_reservation_venues" ON reservation_venues FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_reservation_venues" ON reservation_venues;
CREATE POLICY "insert_reservation_venues" ON reservation_venues FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_reservation_venues" ON reservation_venues;
CREATE POLICY "update_reservation_venues" ON reservation_venues FOR UPDATE
  TO authenticated USING (true);

DROP POLICY IF EXISTS "delete_reservation_venues" ON reservation_venues;
CREATE POLICY "delete_reservation_venues" ON reservation_venues FOR DELETE
  TO authenticated USING (true);

-- Reservation equipment policies
DROP POLICY IF EXISTS "select_reservation_equipment" ON reservation_equipment;
CREATE POLICY "select_reservation_equipment" ON reservation_equipment FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_reservation_equipment" ON reservation_equipment;
CREATE POLICY "insert_reservation_equipment" ON reservation_equipment FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_reservation_equipment" ON reservation_equipment;
CREATE POLICY "update_reservation_equipment" ON reservation_equipment FOR UPDATE
  TO authenticated USING (true);

DROP POLICY IF EXISTS "delete_reservation_equipment" ON reservation_equipment;
CREATE POLICY "delete_reservation_equipment" ON reservation_equipment FOR DELETE
  TO authenticated USING (true);

-- Reservation documents policies
DROP POLICY IF EXISTS "select_reservation_documents" ON reservation_documents;
CREATE POLICY "select_reservation_documents" ON reservation_documents FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_reservation_documents" ON reservation_documents;
CREATE POLICY "insert_reservation_documents" ON reservation_documents FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "delete_reservation_documents" ON reservation_documents;
CREATE POLICY "delete_reservation_documents" ON reservation_documents FOR DELETE
  TO authenticated USING (true);

-- Approvals policies
DROP POLICY IF EXISTS "select_approvals" ON approvals;
CREATE POLICY "select_approvals" ON approvals FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_approvals" ON approvals;
CREATE POLICY "insert_approvals" ON approvals FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin')));

-- Notifications policies
DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_notifications" ON notifications;
CREATE POLICY "insert_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Audit logs policies (admin only)
DROP POLICY IF EXISTS "select_audit_logs" ON audit_logs;
CREATE POLICY "select_audit_logs" ON audit_logs FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- System settings policies
DROP POLICY IF EXISTS "select_system_settings" ON system_settings;
CREATE POLICY "select_system_settings" ON system_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "update_system_settings" ON system_settings;
CREATE POLICY "update_system_settings" ON system_settings FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_facilities_updated_at ON facilities;
CREATE TRIGGER update_facilities_updated_at BEFORE UPDATE ON facilities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reservations_updated_at ON reservations;
CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
