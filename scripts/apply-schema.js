const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function applySchema() {
  console.log('🚀 Starting schema application...\n');

  // Get the correct database URL from the project URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const projectRef = supabaseUrl?.split('//')[1]?.split('.')[0];

  console.log(`📍 Target Project: ${projectRef}`);
  console.log(`🔗 Supabase URL: ${supabaseUrl}\n`);

  // Use DIRECT_URL if available, otherwise construct from URL
  let connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ No DATABASE_URL or DIRECT_URL found in .env');
    process.exit(1);
  }

  // Check if the connection string project matches the NEXT_PUBLIC_SUPABASE_URL project
  if (!connectionString.includes(projectRef)) {
    console.error(`❌ MISMATCH DETECTED!`);
    console.error(`   Frontend uses: ${projectRef}`);
    console.error(`   Database URL points to: ${connectionString.match(/postgres\.([^:]+)/)?.[1]}`);
    console.error(`\n⚠️  You need to update DATABASE_URL and DIRECT_URL in .env to match project ${projectRef}`);
    console.error(`\nGet the correct connection strings from:`);
    console.error(`https://supabase.com/dashboard/project/${projectRef}/settings/database\n`);
    process.exit(1);
  }

  console.log(`🔌 Connecting to database...`);

  const client = new Client({
    connectionString,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Read schema file
    const schemaPath = path.join(__dirname, '../supabase/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('📄 Executing schema.sql...\n');

    // Execute the schema
    await client.query(schema);

    console.log('✅ Schema executed successfully!\n');

    // Verify tables were created
    console.log('🔍 Verifying tables...');
    const tablesResult = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('profiles', 'workflows')
      ORDER BY tablename;
    `);

    if (tablesResult.rows.length === 2) {
      console.log('✅ Tables verified:');
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.tablename}`);
      });
    } else {
      console.log('⚠️  Expected 2 tables (profiles, workflows), found:', tablesResult.rows.length);
    }

    // Check policies
    console.log('\n🔍 Verifying RLS policies...');
    const policiesResult = await client.query(`
      SELECT tablename, COUNT(*) as policy_count
      FROM pg_policies
      WHERE schemaname = 'public'
      GROUP BY tablename
      ORDER BY tablename;
    `);

    console.log('✅ RLS policies:');
    policiesResult.rows.forEach(row => {
      console.log(`   - ${row.tablename}: ${row.policy_count} policies`);
    });

    console.log('\n🎉 Schema application complete!');
    console.log('\n📋 Next steps:');
    console.log('   1. Reload PostgREST cache (this may take 1-2 minutes automatically)');
    console.log('   2. Go to http://localhost:3000/test-setup');
    console.log('   3. Click "Run All Tests" to verify\n');

  } catch (error) {
    console.error('❌ Error applying schema:', error);
    console.error('\nError details:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

applySchema();
