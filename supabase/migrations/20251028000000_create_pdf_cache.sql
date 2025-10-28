-- ============================================
-- PDF CACHE TABLE MIGRATION
-- ============================================
-- This migration creates the pdf_cache table to store
-- parsed PDF results with TTL for performance optimization.

-- Create pdf_cache table
CREATE TABLE IF NOT EXISTS public.pdf_cache (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- PDF identifier (uploadcare UUID, file hash, or URL hash)
  pdf_identifier TEXT NOT NULL UNIQUE,

  -- Parsed content
  parsed_text TEXT,
  segments JSONB DEFAULT '[]'::jsonb,
  page_count INTEGER,

  -- Metadata
  parse_method TEXT NOT NULL CHECK (parse_method IN ('text', 'gemini', 'hybrid')),
  file_size BIGINT,
  file_name TEXT,

  -- Gemini-specific metadata
  gemini_file_uri TEXT, -- For File API caching
  gemini_cache_name TEXT, -- For context caching

  -- Timing & performance metrics
  parse_duration_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days') NOT NULL,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  access_count INTEGER DEFAULT 1 NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS pdf_cache_pdf_identifier_idx ON public.pdf_cache(pdf_identifier);
CREATE INDEX IF NOT EXISTS pdf_cache_expires_at_idx ON public.pdf_cache(expires_at);
CREATE INDEX IF NOT EXISTS pdf_cache_created_at_idx ON public.pdf_cache(created_at DESC);
CREATE INDEX IF NOT EXISTS pdf_cache_gemini_file_uri_idx ON public.pdf_cache(gemini_file_uri) WHERE gemini_file_uri IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.pdf_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow all authenticated users to read from cache
CREATE POLICY "Authenticated users can view cache entries"
  ON public.pdf_cache
  FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Only service role can insert (API routes use service role)
CREATE POLICY "Service role can insert cache entries"
  ON public.pdf_cache
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Only service role can update cache entries
CREATE POLICY "Service role can update cache entries"
  ON public.pdf_cache
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- Only service role can delete cache entries
CREATE POLICY "Service role can delete cache entries"
  ON public.pdf_cache
  FOR DELETE
  USING (auth.role() = 'service_role');

-- Function to update last_accessed_at and access_count
CREATE OR REPLACE FUNCTION public.update_pdf_cache_access()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_accessed_at = NOW();
  NEW.access_count = OLD.access_count + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Access tracking would require manual UPDATE calls from the app
-- We won't use a trigger here as SELECT doesn't trigger row-level triggers

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_pdf_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.pdf_cache
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to authenticated users and service role
GRANT SELECT ON public.pdf_cache TO authenticated;
GRANT ALL ON public.pdf_cache TO service_role;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'PDF cache table created successfully with 7-day TTL';
END $$;
