#!/usr/bin/env tsx

/**
 * Cleanup script to delete empty "Untitled Workflow" entries from the database
 *
 * This script removes workflows that:
 * - Have name "Untitled Workflow"
 * - Have no nodes
 * - Have no edges
 * - Have description "A new workflow" or empty/null description
 *
 * Run with: npx tsx scripts/cleanup-empty-workflows.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Searching for empty workflows...\n');

  // Find all workflows with name "Untitled Workflow"
  const { data: workflows, error } = await supabase
    .from('workflows')
    .select('id, name, description, nodes, edges, created_at, updated_at, user_id')
    .eq('name', 'Untitled Workflow');

  if (error) {
    console.error('❌ Error fetching workflows:', error);
    process.exit(1);
  }

  if (!workflows || workflows.length === 0) {
    console.log('✅ No "Untitled Workflow" entries found. Database is clean!');
    rl.close();
    return;
  }

  // Filter for truly empty workflows
  const emptyWorkflows = workflows.filter((w: any) => {
    const nodeCount = Array.isArray(w.nodes) ? w.nodes.length : 0;
    const edgeCount = Array.isArray(w.edges) ? w.edges.length : 0;
    const hasGenericDesc = !w.description || w.description.trim() === '' || w.description === 'A new workflow';

    return nodeCount === 0 && edgeCount === 0 && hasGenericDesc;
  });

  if (emptyWorkflows.length === 0) {
    console.log('✅ No empty workflows found. All "Untitled Workflow" entries have content.');
    rl.close();
    return;
  }

  console.log(`Found ${emptyWorkflows.length} empty workflow(s):\n`);

  // Group by user for better display
  const byUser = emptyWorkflows.reduce((acc: any, w: any) => {
    if (!acc[w.user_id]) {
      acc[w.user_id] = [];
    }
    acc[w.user_id].push(w);
    return acc;
  }, {});

  Object.entries(byUser).forEach(([userId, workflows]: [string, any]) => {
    console.log(`  User: ${userId.substring(0, 8)}...`);
    console.log(`    Count: ${workflows.length}`);
    console.log(`    Created: ${new Date(workflows[0].created_at).toLocaleString()}`);
    if (workflows.length > 1) {
      console.log(`    Last: ${new Date(workflows[workflows.length - 1].created_at).toLocaleString()}`);
    }
    console.log('');
  });

  const answer = await question(`⚠️  Delete these ${emptyWorkflows.length} empty workflows? (yes/no): `);

  if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
    console.log('❌ Cancelled. No workflows deleted.');
    rl.close();
    return;
  }

  console.log('\n🗑️  Deleting empty workflows...');

  const ids = emptyWorkflows.map((w: any) => w.id);
  const { error: deleteError } = await supabase
    .from('workflows')
    .delete()
    .in('id', ids);

  if (deleteError) {
    console.error('❌ Error deleting workflows:', deleteError);
    process.exit(1);
  }

  console.log(`✅ Successfully deleted ${emptyWorkflows.length} empty workflow(s)!\n`);
  rl.close();
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  rl.close();
  process.exit(1);
});
