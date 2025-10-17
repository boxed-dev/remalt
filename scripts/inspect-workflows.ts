#!/usr/bin/env tsx

/**
 * Inspect all workflows in the database to understand what's there
 *
 * Run with: npx tsx scripts/inspect-workflows.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Fetching all workflows from database...\n');

  const { data: workflows, error } = await supabase
    .from('workflows')
    .select('id, name, description, nodes, edges, created_at, updated_at, user_id')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching workflows:', error);
    process.exit(1);
  }

  if (!workflows || workflows.length === 0) {
    console.log('✅ No workflows found in database.');
    return;
  }

  console.log(`Found ${workflows.length} total workflow(s)\n`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Group by user and name pattern
  const stats = {
    totalWorkflows: workflows.length,
    byName: {} as Record<string, number>,
    emptyWorkflows: [] as any[],
    byUser: {} as Record<string, any[]>,
  };

  workflows.forEach((w: any) => {
    // Count by name
    if (!stats.byName[w.name]) {
      stats.byName[w.name] = 0;
    }
    stats.byName[w.name]++;

    // Group by user
    if (!stats.byUser[w.user_id]) {
      stats.byUser[w.user_id] = [];
    }
    stats.byUser[w.user_id].push(w);

    // Check if empty
    const nodeCount = Array.isArray(w.nodes) ? w.nodes.length : 0;
    const edgeCount = Array.isArray(w.edges) ? w.edges.length : 0;

    if (nodeCount === 0 && edgeCount === 0) {
      stats.emptyWorkflows.push({
        ...w,
        nodeCount,
        edgeCount,
      });
    }
  });

  console.log('📊 Statistics:\n');
  console.log(`Total Workflows: ${stats.totalWorkflows}`);
  console.log(`Unique Names: ${Object.keys(stats.byName).length}`);
  console.log(`Empty Workflows (no nodes/edges): ${stats.emptyWorkflows.length}\n`);

  console.log('📝 Workflows by Name:\n');
  Object.entries(stats.byName)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .forEach(([name, count]) => {
      console.log(`  ${name}: ${count}`);
    });

  if (stats.emptyWorkflows.length > 0) {
    console.log('\n\n🗑️  Empty Workflows (candidates for cleanup):\n');
    console.log('───────────────────────────────────────────────────────────────\n');

    stats.emptyWorkflows.forEach((w, index) => {
      console.log(`${index + 1}. Name: ${w.name}`);
      console.log(`   ID: ${w.id}`);
      console.log(`   User: ${w.user_id.substring(0, 8)}...`);
      console.log(`   Description: ${w.description || '(none)'}`);
      console.log(`   Nodes: ${w.nodeCount}, Edges: ${w.edgeCount}`);
      console.log(`   Created: ${new Date(w.created_at).toLocaleString()}`);
      console.log(`   Updated: ${new Date(w.updated_at).toLocaleString()}`);
      console.log('');
    });
  }

  console.log('\n👥 Workflows by User:\n');
  console.log('───────────────────────────────────────────────────────────────\n');

  Object.entries(stats.byUser).forEach(([userId, userWorkflows]) => {
    const empty = userWorkflows.filter((w: any) => {
      const nodeCount = Array.isArray(w.nodes) ? w.nodes.length : 0;
      const edgeCount = Array.isArray(w.edges) ? w.edges.length : 0;
      return nodeCount === 0 && edgeCount === 0;
    });

    console.log(`User: ${userId.substring(0, 8)}...`);
    console.log(`  Total: ${userWorkflows.length} workflows`);
    console.log(`  Empty: ${empty.length} workflows`);
    console.log(`  With Content: ${userWorkflows.length - empty.length} workflows`);
    console.log('');
  });

  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
