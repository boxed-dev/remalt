import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://enohvkozrazgjpbmnkgr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVub2h2a296cmF6Z2pwYm1ua2dyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTE3MjQzNiwiZXhwIjoyMDc0NzQ4NDM2fQ.8fs2Q0bj8jnt_1JQvzNN04JgfOmi3_oHk-pbRGdu3A8'
);

async function checkSchema() {
  console.log('🔍 Checking Supabase schema...\n');

  // Check if profiles table exists
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);

  console.log('1. Profiles table:');
  if (profilesError) {
    console.log('   ❌ Error:', profilesError.message);
  } else {
    console.log('   ✅ Exists');
  }

  // Check if workflows table exists
  const { data: workflows, error: workflowsError } = await supabase
    .from('workflows')
    .select('*')
    .limit(1);

  console.log('\n2. Workflows table:');
  if (workflowsError) {
    console.log('   ❌ Error:', workflowsError.message);
  } else {
    console.log('   ✅ Exists');
  }

  // Check storage buckets
  const { data: buckets, error: bucketsError } = await supabase
    .storage
    .listBuckets();

  console.log('\n3. Storage buckets:');
  if (bucketsError) {
    console.log('   ❌ Error:', bucketsError.message);
  } else {
    console.log('   Found:', buckets.map(b => b.name).join(', ') || 'none');
    const hasAudioBucket = buckets.some(b => b.name === 'workflow-audio');
    console.log('   workflow-audio bucket:', hasAudioBucket ? '✅ Exists' : '❌ Missing');
  }

  // Check auth users
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

  console.log('\n4. Auth users:');
  if (usersError) {
    console.log('   ❌ Error:', usersError.message);
  } else {
    console.log('   Total users:', users.length);
    if (users.length > 0) {
      console.log('   Users:');
      users.forEach(u => {
        console.log(`     - ${u.email} (confirmed: ${!!u.email_confirmed_at}, id: ${u.id.substring(0, 8)}...)`);
      });
    } else {
      console.log('   No users found');
    }
  }

  // Check for triggers and functions
  console.log('\n5. Checking database functions and triggers...');
  const { data: functionsData, error: functionsError } = await supabase.rpc('version').catch(() => ({ data: null, error: { message: 'RPC not available' } }));

  if (functionsError && functionsError.message !== 'RPC not available') {
    console.log('   ⚠️  Cannot check functions directly');
  }

  console.log('\n✅ Schema check complete!\n');
}

checkSchema().catch(err => {
  console.error('❌ Error checking schema:', err);
  process.exit(1);
});
