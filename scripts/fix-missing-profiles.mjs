import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '../.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('\n❌ Error: Missing Supabase credentials in .env.local\n');
  console.error('Required environment variables:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY\n');
  process.exit(1);
}

console.log('\n🔧 Fixing Missing Profiles\n');
console.log('📍 Supabase URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixMissingProfiles() {
  try {
    console.log('\n1️⃣ Fetching all users from auth.users...');
    
    // Get all users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      throw new Error(`Failed to fetch auth users: ${authError.message}`);
    }
    
    console.log(`   ✅ Found ${authUsers.users.length} authenticated users`);
    
    console.log('\n2️⃣ Checking existing profiles...');
    
    // Get all existing profiles
    const { data: existingProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id');
    
    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }
    
    const existingProfileIds = new Set(existingProfiles.map(p => p.id));
    console.log(`   ✅ Found ${existingProfiles.length} existing profiles`);
    
    // Find users without profiles
    const usersWithoutProfiles = authUsers.users.filter(user => !existingProfileIds.has(user.id));
    
    console.log(`\n3️⃣ Found ${usersWithoutProfiles.length} users without profiles`);
    
    if (usersWithoutProfiles.length === 0) {
      console.log('\n✅ All users already have profiles!\n');
      return;
    }
    
    console.log('\n4️⃣ Creating missing profiles...');
    
    const profilesToCreate = usersWithoutProfiles.map(user => ({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || null,
      avatar_url: user.user_metadata?.avatar_url || null,
      created_at: user.created_at,
      updated_at: new Date().toISOString()
    }));
    
    const { data: createdProfiles, error: insertError } = await supabase
      .from('profiles')
      .insert(profilesToCreate)
      .select();
    
    if (insertError) {
      throw new Error(`Failed to create profiles: ${insertError.message}`);
    }
    
    console.log(`   ✅ Successfully created ${createdProfiles.length} profiles`);
    
    // List the users
    console.log('\n   📋 Created profiles for:');
    createdProfiles.forEach(profile => {
      console.log(`      - ${profile.email} (${profile.id})`);
    });
    
    console.log('\n5️⃣ Verifying fix...');
    
    // Re-check for users without profiles
    const { data: updatedProfiles, error: verifyError } = await supabase
      .from('profiles')
      .select('id');
    
    if (verifyError) {
      throw new Error(`Failed to verify profiles: ${verifyError.message}`);
    }
    
    const updatedProfileIds = new Set(updatedProfiles.map(p => p.id));
    const stillMissing = authUsers.users.filter(user => !updatedProfileIds.has(user.id));
    
    if (stillMissing.length === 0) {
      console.log('   ✅ All users now have profiles!\n');
      console.log('━'.repeat(60));
      console.log('✅ SUCCESS! Missing profiles have been fixed.');
      console.log('━'.repeat(60));
      console.log('\nYou can now save workflows in the app.\n');
    } else {
      console.log(`   ⚠️  Still ${stillMissing.length} users without profiles`);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

fixMissingProfiles();


