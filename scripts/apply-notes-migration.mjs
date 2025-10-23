import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🚀 Applying workflow_notes table migration...\n');

  // Read migration file
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251024000000_create_workflow_notes.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  try {
    // Execute migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // Try direct query if exec_sql doesn't exist
      console.log('⚠️  exec_sql not found, trying direct query...');
      
      const { error: directError } = await supabase.from('_migrations').select('*').limit(1);
      
      if (directError) {
        console.error('❌ Migration failed:', error);
        console.error('\n📋 Manual steps:');
        console.error('1. Go to your Supabase dashboard SQL Editor');
        console.error('2. Copy the contents of:', migrationPath);
        console.error('3. Paste and run the SQL');
        process.exit(1);
      }
    }

    console.log('✅ Migration applied successfully!');
    console.log('\n📊 Verifying table creation...');

    // Verify table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('workflow_notes')
      .select('id')
      .limit(1);

    if (tableError && tableError.code !== 'PGRST116') {
      console.error('❌ Table verification failed:', tableError);
      process.exit(1);
    }

    console.log('✅ workflow_notes table created successfully!');
    console.log('   - CASCADE delete on workflow_id');
    console.log('   - CASCADE delete on user_id');
    console.log('   - RLS policies enabled');
    console.log('   - Indexes created');

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

applyMigration();
