import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const migrationSQL = `
-- Create workflow_notes table
CREATE TABLE IF NOT EXISTS public.workflow_notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT workflow_notes_unique UNIQUE (workflow_id, user_id)
);

CREATE INDEX IF NOT EXISTS workflow_notes_workflow_id_idx ON public.workflow_notes(workflow_id);
CREATE INDEX IF NOT EXISTS workflow_notes_user_id_idx ON public.workflow_notes(user_id);
CREATE INDEX IF NOT EXISTS workflow_notes_updated_at_idx ON public.workflow_notes(updated_at DESC);

ALTER TABLE public.workflow_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notes" ON public.workflow_notes;
CREATE POLICY "Users can view their own notes"
  ON public.workflow_notes FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own notes" ON public.workflow_notes;
CREATE POLICY "Users can create their own notes"
  ON public.workflow_notes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notes" ON public.workflow_notes;
CREATE POLICY "Users can update their own notes"
  ON public.workflow_notes FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notes" ON public.workflow_notes;
CREATE POLICY "Users can delete their own notes"
  ON public.workflow_notes FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_workflow_notes_updated_at ON public.workflow_notes;
CREATE TRIGGER set_workflow_notes_updated_at
  BEFORE UPDATE ON public.workflow_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

GRANT ALL ON public.workflow_notes TO authenticated;
`;

console.log('🚀 Applying workflow_notes migration...\n');
console.log('📋 Please manually run this SQL in Supabase SQL Editor:');
console.log('=' .repeat(60));
console.log(migrationSQL);
console.log('='.repeat(60));

// Test if table exists
async function checkTable() {
  const { data, error } = await supabase
    .from('workflow_notes')
    .select('id')
    .limit(1);

  if (error && error.code === '42P01') {
    console.log('\n⚠️  Table does not exist yet. Please run the SQL above in Supabase SQL Editor.');
    console.log('   Dashboard: https://supabase.com/dashboard/project/' + supabaseUrl.split('//')[1].split('.')[0] + '/editor');
  } else if (error) {
    console.log('\n❌ Error:', error.message);
  } else {
    console.log('\n✅ workflow_notes table exists!');
  }
}

checkTable();
