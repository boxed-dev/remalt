-- ============================================
-- REMALT DATABASE SCHEMA
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- WORKFLOWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.workflows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Workflow data
  nodes JSONB DEFAULT '[]'::jsonb NOT NULL,
  edges JSONB DEFAULT '[]'::jsonb NOT NULL,
  viewport JSONB DEFAULT '{"x": 0, "y": 0, "zoom": 1}'::jsonb NOT NULL,

  -- Metadata
  metadata JSONB DEFAULT '{
    "version": "1.0.0",
    "tags": [],
    "isPublic": false
  }'::jsonb NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Indexes for better performance
  CONSTRAINT workflows_name_not_empty CHECK (char_length(name) > 0)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS workflows_user_id_idx ON public.workflows(user_id);
CREATE INDEX IF NOT EXISTS workflows_created_at_idx ON public.workflows(created_at DESC);
CREATE INDEX IF NOT EXISTS workflows_updated_at_idx ON public.workflows(updated_at DESC);
CREATE INDEX IF NOT EXISTS workflows_metadata_idx ON public.workflows USING gin(metadata);

-- Enable Row Level Security
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

-- Workflows policies
CREATE POLICY "Users can view their own workflows"
  ON public.workflows
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view public workflows"
  ON public.workflows
  FOR SELECT
  USING (
    (metadata->>'isPublic')::boolean = true
  );

CREATE POLICY "Users can create their own workflows"
  ON public.workflows
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workflows"
  ON public.workflows
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workflows"
  ON public.workflows
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for workflows updated_at
DROP TRIGGER IF EXISTS set_workflows_updated_at ON public.workflows;
CREATE TRIGGER set_workflows_updated_at
  BEFORE UPDATE ON public.workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for profiles updated_at
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- GRANTS
-- ============================================

-- Grant access to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.workflows TO authenticated;

-- ============================================
-- STORAGE: WORKFLOW AUDIO
-- ============================================
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

-- ============================================
-- SAMPLE DATA (OPTIONAL - Remove in production)
-- ============================================

-- You can add sample workflows here for testing
