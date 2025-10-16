-- Create workflow PDFs storage bucket and policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'workflow-pdfs') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
    VALUES (
      'workflow-pdfs', 
      'workflow-pdfs', 
      false, 
      52428800, -- 50MB limit
      ARRAY['application/pdf']::text[]
    );
  END IF;
END;
$$;

-- Policy: Users can read their own PDF files
DROP POLICY IF EXISTS "Users can read workflow PDFs" ON storage.objects;
CREATE POLICY "Users can read workflow PDFs"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'workflow-pdfs'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- Policy: Users can upload their own PDF files
DROP POLICY IF EXISTS "Users can upload workflow PDFs" ON storage.objects;
CREATE POLICY "Users can upload workflow PDFs"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'workflow-pdfs'
    AND split_part(name, '/', 1) = auth.uid()::text
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users can update their own PDF files
DROP POLICY IF EXISTS "Users can update workflow PDFs" ON storage.objects;
CREATE POLICY "Users can update workflow PDFs"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'workflow-pdfs'
    AND split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'workflow-pdfs'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- Policy: Users can delete their own PDF files
DROP POLICY IF EXISTS "Users can delete workflow PDFs" ON storage.objects;
CREATE POLICY "Users can delete workflow PDFs"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'workflow-pdfs'
    AND split_part(name, '/', 1) = auth.uid()::text
  );


