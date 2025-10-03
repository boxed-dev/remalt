const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function applySchemaViaAPI() {
  console.log('🚀 Applying schema via Supabase REST API...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  const projectRef = supabaseUrl.split('//')[1]?.split('.')[0];
  console.log(`📍 Target Project: ${projectRef}`);
  console.log(`🔗 Supabase URL: ${supabaseUrl}\n`);

  // Check if service role key matches
  if (serviceRoleKey) {
    try {
      const payload = JSON.parse(Buffer.from(serviceRoleKey.split('.')[1], 'base64').toString());
      if (payload.ref !== projectRef) {
        console.error(`⚠️  WARNING: Service role key is for project '${payload.ref}', but you're using '${projectRef}'`);
        console.error(`   This may cause issues. Get the correct service role key from:`);
        console.error(`   https://supabase.com/dashboard/project/${projectRef}/settings/api\n`);
      }
    } catch (e) {
      console.warn('⚠️  Could not verify service role key');
    }
  }

  // Read schema file
  const schemaPath = path.join(__dirname, '../supabase/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  console.log('📄 Schema loaded, executing via REST API...\n');

  // Split schema into individual statements
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📊 Found ${statements.length} SQL statements to execute\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    const preview = statement.substring(0, 60).replace(/\n/g, ' ');

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${serviceRoleKey || anonKey}`,
        },
        body: JSON.stringify({
          sql: statement + ';'
        })
      });

      if (!response.ok) {
        const error = await response.text();

        // Check if it's a "already exists" error which we can ignore
        if (error.includes('already exists') || error.includes('duplicate')) {
          console.log(`⏭️  [${i + 1}/${statements.length}] Skipped (already exists): ${preview}...`);
          successCount++;
        } else {
          console.error(`❌ [${i + 1}/${statements.length}] Failed: ${preview}...`);
          console.error(`   Error: ${error.substring(0, 200)}`);
          errorCount++;
        }
      } else {
        console.log(`✅ [${i + 1}/${statements.length}] ${preview}...`);
        successCount++;
      }
    } catch (error) {
      console.error(`❌ [${i + 1}/${statements.length}] Exception: ${error.message}`);
      errorCount++;
    }
  }

  console.log(`\n📊 Results:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);

  if (errorCount === 0) {
    console.log('\n🎉 Schema application complete!');
  } else {
    console.log('\n⚠️  Some statements failed. This may be normal if tables already exist.');
  }

  console.log('\n⏳ Waiting 5 seconds for PostgREST cache to reload...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('\n📋 Next steps:');
  console.log('   1. Go to http://localhost:3000/test-setup');
  console.log('   2. Click "Run All Tests" to verify\n');
}

applySchemaViaAPI().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
