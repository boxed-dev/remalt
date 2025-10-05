-- Create workflow audio storage bucket and policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'workflow-audio') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('workflow-audio', 'workflow-audio', false);
  END IF;
END;
$$;

DROP POLICY IF EXISTS "Users can read workflow recordings" ON storage.objects;
CREATE POLICY "Users can read workflow recordings"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'workflow-audio'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can upload workflow recordings" ON storage.objects;
CREATE POLICY "Users can upload workflow recordings"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'workflow-audio'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update workflow recordings" ON storage.objects;
CREATE POLICY "Users can update workflow recordings"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'workflow-audio'
    AND split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'workflow-audio'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete workflow recordings" ON storage.objects;
CREATE POLICY "Users can delete workflow recordings"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'workflow-audio'
    AND split_part(name, '/', 1) = auth.uid()::text
  );
