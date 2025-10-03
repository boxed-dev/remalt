const { Client } = require('pg');
require('dotenv').config();

async function checkSchema() {
  console.log('🔍 Checking database schema...\n');

  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check tables
    console.log('📊 Checking tables...');
    const tables = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('profiles', 'workflows')
      ORDER BY tablename;
    `);

    if (tables.rows.length > 0) {
      console.log('✅ Found tables:');
      tables.rows.forEach(row => console.log(`   - ${row.tablename}`));
    } else {
      console.log('❌ No tables found');
    }

    // Check policies
    console.log('\n🔒 Checking RLS policies...');
    const policies = await client.query(`
      SELECT tablename, policyname
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `);

    if (policies.rows.length > 0) {
      console.log('✅ Found policies:');
      policies.rows.forEach(row => console.log(`   - ${row.tablename}: ${row.policyname}`));
    } else {
      console.log('❌ No policies found');
    }

    // Check functions
    console.log('\n⚙️  Checking functions...');
    const functions = await client.query(`
      SELECT proname as function_name
      FROM pg_proc
      WHERE pronamespace = 'public'::regnamespace
      AND proname IN ('handle_new_user', 'handle_updated_at')
      ORDER BY proname;
    `);

    if (functions.rows.length > 0) {
      console.log('✅ Found functions:');
      functions.rows.forEach(row => console.log(`   - ${row.function_name}`));
    } else {
      console.log('❌ No functions found');
    }

    // Check triggers
    console.log('\n🔔 Checking triggers...');
    const triggers = await client.query(`
      SELECT tgname as trigger_name, tgrelid::regclass as table_name
      FROM pg_trigger
      WHERE tgname IN (
        'on_auth_user_created',
        'set_workflows_updated_at',
        'set_profiles_updated_at'
      )
      ORDER BY tgname;
    `);

    if (triggers.rows.length > 0) {
      console.log('✅ Found triggers:');
      triggers.rows.forEach(row => console.log(`   - ${row.trigger_name} on ${row.table_name}`));
    } else {
      console.log('❌ No triggers found');
    }

    // Check if workflows table is in PostgREST cache
    console.log('\n🔍 Checking PostgREST visibility...');
    console.log('   Testing if table is accessible via Supabase client...');

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('SUMMARY');
    console.log('='.repeat(50));

    const hasProfiles = tables.rows.some(r => r.tablename === 'profiles');
    const hasWorkflows = tables.rows.some(r => r.tablename === 'workflows');
    const hasPolicies = policies.rows.length >= 7; // Should have at least 7 policies
    const hasFunctions = functions.rows.length === 2;
    const hasTriggers = triggers.rows.length >= 2;

    console.log(`Profiles table:     ${hasProfiles ? '✅' : '❌'}`);
    console.log(`Workflows table:    ${hasWorkflows ? '✅' : '❌'}`);
    console.log(`RLS Policies:       ${hasPolicies ? '✅' : '❌'} (${policies.rows.length} found)`);
    console.log(`Functions:          ${hasFunctions ? '✅' : '❌'} (${functions.rows.length}/2)`);
    console.log(`Triggers:           ${hasTriggers ? '✅' : '❌'} (${triggers.rows.length} found)`);

    if (hasProfiles && hasWorkflows && hasPolicies && hasFunctions) {
      console.log('\n🎉 Schema appears to be fully applied!');
      console.log('\n⏳ If /test-setup still shows errors, wait 1-2 minutes');
      console.log('   for PostgREST cache to reload, then try again.');
    } else {
      console.log('\n⚠️  Schema is incomplete. Some components are missing.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkSchema();
