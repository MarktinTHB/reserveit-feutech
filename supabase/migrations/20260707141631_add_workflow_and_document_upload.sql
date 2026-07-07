/*
# Reservation Workflow & Document Upload Migration

1. Changes
- Add `file_size` (bigint) and `file_type` (text) columns to `reservation_documents` for real file upload metadata.
- Create a Supabase Storage bucket `reservation-documents` for storing uploaded files.
- Add storage policies allowing authenticated users to upload to their own folder and all authenticated users to read.
- Update the `approvals` table CHECK constraint to allow new workflow actions: 'reviewed', 'processing', 'completed'.
- Update the `reservations` table status CHECK constraint to allow 'reviewed' and 'processing' statuses.

2. Security
- Storage bucket is private (not public). Access controlled via RLS policies.
- Users can upload files to a path prefixed with their own user ID.
- All authenticated users can read documents (admins need to review them).
- Only the file owner or admin can delete files.
*/

-- 1. Add file metadata columns to reservation_documents
ALTER TABLE reservation_documents
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ADD COLUMN IF NOT EXISTS file_type text;

-- 2. Create storage bucket for reservation documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('reservation-documents', 'reservation-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS policies
-- Allow authenticated users to upload files to their own folder
DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
CREATE POLICY "Users can upload own documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'reservation-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow all authenticated users to read documents (admins need to review)
DROP POLICY IF EXISTS "Authenticated can read documents" ON storage.objects;
CREATE POLICY "Authenticated can read documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'reservation-documents');

-- Allow file owner or admin to delete
DROP POLICY IF EXISTS "Owner or admin can delete documents" ON storage.objects;
CREATE POLICY "Owner or admin can delete documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'reservation-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- 4. Update approvals CHECK constraint to include workflow stages
ALTER TABLE approvals DROP CONSTRAINT IF EXISTS approvals_action_check;
ALTER TABLE approvals ADD CONSTRAINT approvals_action_check
  CHECK (action IN ('approved', 'rejected', 'revision_requested', 'reviewed', 'processing', 'completed'));

-- 5. Update reservations status CHECK constraint to include workflow stages
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_status_check;
ALTER TABLE reservations ADD CONSTRAINT reservations_status_check
  CHECK (status IN ('pending', 'reviewed', 'processing', 'approved', 'rejected', 'revision_requested', 'cancelled', 'completed'));
