-- Create unified media storage bucket for all file types
-- This replaces the need for separate buckets (workflow_audio, workflow_pdfs, instagram_videos)
-- and replaces Uploadcare CDN storage

-- Create the media bucket with public access
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true, -- Public bucket for direct URL access
  52428800, -- 50MB in bytes (50 * 1024 * 1024)
  ARRAY[
    'image/*',           -- All image types (JPEG, PNG, GIF, WebP, etc.)
    'application/pdf',   -- PDF documents
    'audio/*',           -- All audio types (MP3, WAV, M4A, etc.)
    'video/*'            -- All video types (MP4, MOV, etc. - for Instagram)
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to upload files to their own user folder
CREATE POLICY "Users can upload to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow authenticated users to read their own files
CREATE POLICY "Users can read their own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow public read access (since bucket is public)
-- This allows anyone with the URL to access files
CREATE POLICY "Public read access for media bucket"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'media');

-- Policy: Allow authenticated users to update their own files
CREATE POLICY "Users can update their own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'media' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow authenticated users to delete their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Note: Existing buckets (workflow_audio, workflow_pdfs, instagram_videos) can remain
-- for backward compatibility with old data, but new uploads will use this unified bucket.
-- File structure: media/{user_id}/{type}/{uuid}-{filename}
-- Examples:
--   media/abc-123-def/pdfs/550e8400-e29b-41d4-a716-446655440000-document.pdf
--   media/abc-123-def/images/550e8400-e29b-41d4-a716-446655440000-photo.jpg
--   media/abc-123-def/audio/550e8400-e29b-41d4-a716-446655440000-recording.mp3
--   media/abc-123-def/instagram/550e8400-e29b-41d4-a716-446655440000-video.mp4
