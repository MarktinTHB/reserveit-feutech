/*
# Create Storage Buckets for Documents and Avatars

The application references a "reservation-documents" bucket for file uploads,
but no bucket exists. This creates:
1. "reservation-documents" — for reservation supporting documents
2. "avatars" — for user profile pictures

Both buckets are public (read access) so preview/download works via public URLs.
Write access is controlled by RLS policies below.
*/

-- Create reservation-documents bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('reservation-documents', 'reservation-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Create avatars bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for reservation-documents
-- Allow authenticated users to upload to their own folder
DROP POLICY IF EXISTS "upload_own_documents" ON storage.objects;
CREATE POLICY "upload_own_documents" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'reservation-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to update their own documents
DROP POLICY IF EXISTS "update_own_documents" ON storage.objects;
CREATE POLICY "update_own_documents" ON storage.objects FOR UPDATE
  TO authenticated USING (
    bucket_id = 'reservation-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow public read of documents (so admins can preview/download)
DROP POLICY IF EXISTS "read_documents" ON storage.objects;
CREATE POLICY "read_documents" ON storage.objects FOR SELECT
  TO public USING (bucket_id = 'reservation-documents');

-- Allow authenticated users to delete their own documents
DROP POLICY IF EXISTS "delete_own_documents" ON storage.objects;
CREATE POLICY "delete_own_documents" ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'reservation-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage policies for avatars
-- Allow authenticated users to upload their own avatar
DROP POLICY IF EXISTS "upload_own_avatar" ON storage.objects;
CREATE POLICY "upload_own_avatar" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to update their own avatar
DROP POLICY IF EXISTS "update_own_avatar" ON storage.objects;
CREATE POLICY "update_own_avatar" ON storage.objects FOR UPDATE
  TO authenticated USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow public read of avatars
DROP POLICY IF EXISTS "read_avatars" ON storage.objects;
CREATE POLICY "read_avatars" ON storage.objects FOR SELECT
  TO public USING (bucket_id = 'avatars');

-- Allow authenticated users to delete their own avatar
DROP POLICY IF EXISTS "delete_own_avatar" ON storage.objects;
CREATE POLICY "delete_own_avatar" ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
