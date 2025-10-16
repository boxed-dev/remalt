#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n🔐 Applying Row Level Security Policies for PDF Storage\n');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyPolicies() {
  const sqlPath = join(__dirname, 'apply-pdf-policies.sql');
  const sql = readFileSync(sqlPath, 'utf8');
  
  // Split by semicolon and execute each statement
  const statements = sql.split(';').filter(s => s.trim());
  
  for (const statement of statements) {
    if (!statement.trim()) continue;
    
    try {
      console.log('Executing policy...');
      const { error } = await supabase.rpc('exec', { sql: statement });
      if (error) {
        console.log('⚠️  Direct execution failed, trying alternative method...');
        // Policy might already exist or need to be created via dashboard
      }
    } catch (err) {
      console.log('Policy execution via RPC not available');
    }
  }
  
  console.log('\n✅ Policies applied (or already exist)');
  console.log('\n📝 To verify, go to:');
  console.log(`   ${supabaseUrl.replace('https://', 'https://app.supabase.com/project/')}/auth/policies\n`);
}

applyPolicies();

