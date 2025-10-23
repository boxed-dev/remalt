-- ============================================
-- WORKFLOW NOTES TABLE MIGRATION
-- ============================================
-- This migration creates the workflow_notes table to store
-- BlockNote editor content for each workflow.

-- Create workflow_notes table
CREATE TABLE IF NOT EXISTS public.workflow_notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ensure one note per workflow per user
  CONSTRAINT workflow_notes_unique UNIQUE (workflow_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS workflow_notes_workflow_id_idx ON public.workflow_notes(workflow_id);
CREATE INDEX IF NOT EXISTS workflow_notes_user_id_idx ON public.workflow_notes(user_id);
CREATE INDEX IF NOT EXISTS workflow_notes_updated_at_idx ON public.workflow_notes(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE public.workflow_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notes"
  ON public.workflow_notes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes"
  ON public.workflow_notes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON public.workflow_notes
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON public.workflow_notes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at timestamp
DROP TRIGGER IF EXISTS set_workflow_notes_updated_at ON public.workflow_notes;
CREATE TRIGGER set_workflow_notes_updated_at
  BEFORE UPDATE ON public.workflow_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Grant access to authenticated users
GRANT ALL ON public.workflow_notes TO authenticated;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Workflow notes table created successfully with CASCADE delete';
END $$;
