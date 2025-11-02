-- Create media analysis cache table for super fast repeated requests
CREATE TABLE IF NOT EXISTS media_analysis_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  media_type TEXT NOT NULL, -- 'instagram_video', 'instagram_image', 'image', 'linkedin', 'youtube', etc.
  analysis_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  accessed_count INTEGER DEFAULT 1,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast URL lookups
CREATE INDEX IF NOT EXISTS idx_media_cache_url ON media_analysis_cache(url);

-- Index for media type queries
CREATE INDEX IF NOT EXISTS idx_media_cache_type ON media_analysis_cache(media_type);

-- Index for expiration cleanup
CREATE INDEX IF NOT EXISTS idx_media_cache_expires ON media_analysis_cache(expires_at);

-- Enable Row Level Security
ALTER TABLE media_analysis_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read from cache
CREATE POLICY "Anyone can read media cache"
  ON media_analysis_cache
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can insert into cache
CREATE POLICY "Authenticated users can insert media cache"
  ON media_analysis_cache
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Authenticated users can update their cache entries
CREATE POLICY "Authenticated users can update media cache"
  ON media_analysis_cache
  FOR UPDATE
  USING (true);

-- Function to increment access count
CREATE OR REPLACE FUNCTION increment_cache_access(cache_url TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE media_analysis_cache
  SET accessed_count = accessed_count + 1,
      last_accessed_at = NOW()
  WHERE url = cache_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired cache entries (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM media_analysis_cache
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on table
COMMENT ON TABLE media_analysis_cache IS 'Cache for media analysis results to speed up repeated requests. Entries expire after 7 days.';
