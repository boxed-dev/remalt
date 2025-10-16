-- Row Level Security Policies for workflow-pdfs bucket

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

