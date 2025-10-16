#!/usr/bin/env node

/**
 * Setup PDF Storage Bucket in Supabase
 * Run with: node scripts/setup-pdf-storage.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, '../.env.local');
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

console.log('\n🚀 Setting up PDF Storage in Supabase\n');
console.log('📍 Supabase URL:', supabaseUrl);
console.log('');

// Create Supabase client with service role
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupPDFStorage() {
  try {
    // Step 1: Check if bucket already exists
    console.log('1️⃣  Checking for existing buckets...');
    const { data: existingBuckets, error: listError } = await supabase
      .storage
      .listBuckets();

    if (listError) {
      throw new Error(`Failed to list buckets: ${listError.message}`);
    }

    const pdfBucket = existingBuckets?.find(b => b.id === 'workflow-pdfs');

    if (pdfBucket) {
      console.log('   ✅ Bucket "workflow-pdfs" already exists');
      console.log('   📊 Current settings:');
      console.log('      - Public:', pdfBucket.public);
      console.log('      - Size limit:', pdfBucket.file_size_limit ? `${pdfBucket.file_size_limit / 1024 / 1024}MB` : 'None');
    } else {
      // Step 2: Create the bucket
      console.log('   📦 Creating "workflow-pdfs" bucket...');
      
      const { data: newBucket, error: createError } = await supabase
        .storage
        .createBucket('workflow-pdfs', {
          public: false,
          fileSizeLimit: 52428800, // 50MB
          allowedMimeTypes: ['application/pdf']
        });

      if (createError) {
        throw new Error(`Failed to create bucket: ${createError.message}`);
      }

      console.log('   ✅ Bucket created successfully!');
    }

    // Step 3: Apply RLS policies via SQL
    console.log('\n2️⃣  Applying Row Level Security policies...');
    
    const migrationPath = join(__dirname, '../supabase/migrations/20251015000000_create_workflow_pdfs_bucket.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    // Extract just the policy parts (skip bucket creation)
    const policySQL = migrationSQL
      .split('\n')
      .filter(line => !line.includes('INSERT INTO storage.buckets'))
      .join('\n');

    // We need to execute this via the REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ query: policySQL })
    });

    if (!response.ok) {
      console.log('   ⚠️  Could not apply policies via API');
      console.log('\n📋 Please apply these policies manually in Supabase Dashboard → SQL Editor:\n');
      console.log('─'.repeat(80));
      console.log(policySQL);
      console.log('─'.repeat(80));
    } else {
      console.log('   ✅ Policies applied successfully!');
    }

    // Step 4: Verify setup
    console.log('\n3️⃣  Verifying setup...');
    
    const { data: finalBuckets } = await supabase.storage.listBuckets();
    const verifyBucket = finalBuckets?.find(b => b.id === 'workflow-pdfs');

    if (verifyBucket) {
      console.log('   ✅ Verification successful!');
      console.log('\n📦 Bucket Details:');
      console.log('   - Name: workflow-pdfs');
      console.log('   - Public:', verifyBucket.public);
      console.log('   - Size Limit:', verifyBucket.file_size_limit ? `${verifyBucket.file_size_limit / 1024 / 1024}MB` : 'Default');
      console.log('   - Created:', verifyBucket.created_at);
    }

    console.log('\n✅ PDF Storage setup complete!\n');
    console.log('🎉 You can now:');
    console.log('   1. Upload PDFs up to 50MB');
    console.log('   2. Parse PDFs with Gemini AI');
    console.log('   3. Store parsed content securely\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n📋 Manual Setup Required:\n');
    console.error('1. Go to: https://app.supabase.com/project/_/storage/buckets');
    console.error('2. Click "New Bucket"');
    console.error('3. Configure:');
    console.error('   - Name: workflow-pdfs');
    console.error('   - Public: OFF');
    console.error('   - File size limit: 52428800 (50MB)');
    console.error('   - Allowed MIME types: application/pdf');
    console.error('4. Go to SQL Editor and run:');
    console.error('   supabase/migrations/20251015000000_create_workflow_pdfs_bucket.sql\n');
    process.exit(1);
  }
}

// Run setup
setupPDFStorage();

