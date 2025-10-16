#!/usr/bin/env node

/**
 * Script to apply PDF storage bucket migration to Supabase
 * Run with: node scripts/apply-pdf-migration.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials in .env.local');
  console.error('Required:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('\n🚀 Applying PDF Storage Migration\n');
console.log('Supabase URL:', supabaseUrl);

// Create Supabase client with service role
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20251015000000_create_workflow_pdfs_bucket.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');
    console.log('📊 Executing SQL...\n');

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      query: migrationSQL
    });

    if (error) {
      // If exec_sql doesn't exist, we need to execute it differently
      console.log('⚠️  exec_sql function not available');
      console.log('📋 Please apply the migration manually:\n');
      console.log('1. Go to your Supabase Dashboard → SQL Editor');
      console.log('2. Copy and paste the following SQL:\n');
      console.log('─'.repeat(80));
      console.log(migrationSQL);
      console.log('─'.repeat(80));
      console.log('\n3. Click "Run" to execute');
      console.log('\n✅ The migration will create:');
      console.log('   - workflow-pdfs storage bucket (50MB limit)');
      console.log('   - Row Level Security policies');
      return;
    }

    console.log('✅ Migration applied successfully!');
    
    // Verify the bucket was created
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();

    if (!bucketsError && buckets) {
      const pdfBucket = buckets.find(b => b.id === 'workflow-pdfs');
      if (pdfBucket) {
        console.log('\n✅ Verified: workflow-pdfs bucket exists');
        console.log('   - ID:', pdfBucket.id);
        console.log('   - Public:', pdfBucket.public);
        console.log('   - File size limit:', pdfBucket.file_size_limit ? `${pdfBucket.file_size_limit / 1024 / 1024}MB` : 'None');
      } else {
        console.log('\n⚠️  Warning: workflow-pdfs bucket not found in list');
      }
    }

    console.log('\n🎉 PDF Node is now ready to use!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n📋 Manual steps:');
    console.error('1. Go to Supabase Dashboard → SQL Editor');
    console.error('2. Run: supabase/migrations/20251015000000_create_workflow_pdfs_bucket.sql');
    process.exit(1);
  }
}

// Run the migration
applyMigration();

