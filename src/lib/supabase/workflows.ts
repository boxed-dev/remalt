import type { SupabaseClient } from '@supabase/supabase-js';
import type { Workflow } from '@/types/workflow';
import type { Database } from '@/types/supabase';

// Use generated Supabase types for type safety
export type WorkflowRow = Database['public']['Tables']['workflows']['Row'];
export type WorkflowInsert = Database['public']['Tables']['workflows']['Insert'];
export type WorkflowUpdate = Database['public']['Tables']['workflows']['Update'];

/**
 * Convert database row to Workflow type
 */
function rowToWorkflow(row: WorkflowRow): Workflow {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    nodes: (row.nodes as any) || [],
    edges: (row.edges as any) || [],
    viewport: (row.viewport as any) || { x: 0, y: 0, zoom: 1 },
    metadata: (row.metadata as any) || {
      version: '1.0.0',
      tags: [],
      isPublic: false,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convert Workflow type to database row
 */
function workflowToRow(workflow: Workflow, userId: string): Omit<WorkflowRow, 'created_at' | 'updated_at'> {
  return {
    id: workflow.id,
    user_id: userId,
    name: workflow.name,
    description: workflow.description || null,
    nodes: workflow.nodes as any,
    edges: workflow.edges as any,
    viewport: workflow.viewport as any,
    metadata: workflow.metadata as any,
  };
}

/**
 * Workflow summary type for list views (lightweight)
 */
export type WorkflowSummary = {
  id: string;
  name: string;
  description: string | null;
  nodeCount: number;
  updatedAt: string;
  createdAt: string;
  metadata: Workflow['metadata'];
};

/**
 * Fetch workflow summaries for the current user (optimized for list views)
 * Only fetches essential fields, dramatically reducing data transfer
 */
export async function getUserWorkflowsSummary(supabase: SupabaseClient): Promise<WorkflowSummary[]> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.warn('No authenticated user found');
    return [];
  }

  const { data, error } = await supabase
    .from('workflows')
    .select('id, name, description, nodes, metadata, created_at, updated_at')
    .eq('user_id', user.id) // ✅ CRITICAL: Filter by current user
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching workflow summaries:', error);
    throw new Error(error.message);
  }

  return (data as Pick<WorkflowRow, 'id' | 'name' | 'description' | 'nodes' | 'metadata' | 'created_at' | 'updated_at'>[]).map(row => ({
    id: row.id,
    name: row.name,
    description: row.description,
    nodeCount: Array.isArray(row.nodes) ? row.nodes.length : 0,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    metadata: (row.metadata as any) || {
      version: '1.0.0',
      tags: [],
      isPublic: false,
    },
  }));
}

/**
 * Fetch all workflows for the current user
 */
export async function getUserWorkflows(supabase: SupabaseClient): Promise<Workflow[]> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.warn('No authenticated user found');
    return [];
  }

  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .eq('user_id', user.id) // ✅ CRITICAL: Filter by current user
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching workflows:', error);
    throw new Error(error.message);
  }

  return (data as WorkflowRow[]).map(rowToWorkflow);
}

/**
 * Fetch a single workflow by ID
 */
export async function getWorkflow(supabase: SupabaseClient, id: string): Promise<Workflow | null> {
  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    console.error('Error fetching workflow:', error);
    throw new Error(error.message);
  }

  return rowToWorkflow(data as WorkflowRow);
}

/**
 * Create a new workflow
 */
export async function createWorkflow(
  supabase: SupabaseClient,
  workflow: Workflow,
  userId: string
): Promise<Workflow> {
  const row = workflowToRow(workflow, userId);

  const { data, error } = await supabase
    .from('workflows')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error('Error creating workflow:', error);
    throw new Error(error.message);
  }

  return rowToWorkflow(data as WorkflowRow);
}

/**
 * Update an existing workflow
 */
export async function updateWorkflow(
  supabase: SupabaseClient,
  workflow: Workflow,
  userId: string
): Promise<Workflow> {
  const row = workflowToRow(workflow, userId);

  const { data, error } = await supabase
    .from('workflows')
    .update(row)
    .eq('id', workflow.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating workflow:', error);
    throw new Error(error.message);
  }

  return rowToWorkflow(data as WorkflowRow);
}

/**
 * Delete a workflow
 */
export async function deleteWorkflow(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase
    .from('workflows')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting workflow:', error);
    throw new Error(error.message);
  }
}

/**
 * Duplicate a workflow
 */
export async function duplicateWorkflow(
  supabase: SupabaseClient,
  id: string,
  userId: string,
  newName?: string
): Promise<Workflow> {
  // First, get the original workflow
  const original = await getWorkflow(supabase, id);
  if (!original) {
    throw new Error('Workflow not found');
  }

  // Create a new workflow with the same data but new ID
  const duplicate: Workflow = {
    ...original,
    id: crypto.randomUUID(),
    name: newName || `${original.name} (Copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return createWorkflow(supabase, duplicate, userId);
}

/**
 * Search workflows by name or tags
 */
export async function searchWorkflows(
  supabase: SupabaseClient,
  query: string
): Promise<Workflow[]> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.warn('No authenticated user found');
    return [];
  }

  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .eq('user_id', user.id) // ✅ CRITICAL: Filter by current user
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error searching workflows:', error);
    throw new Error(error.message);
  }

  return (data as WorkflowRow[]).map(rowToWorkflow);
}

/**
 * Get workflows by tag
 */
export async function getWorkflowsByTag(
  supabase: SupabaseClient,
  tag: string
): Promise<Workflow[]> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.warn('No authenticated user found');
    return [];
  }

  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .eq('user_id', user.id) // ✅ CRITICAL: Filter by current user
    .contains('metadata', { tags: [tag] })
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching workflows by tag:', error);
    throw new Error(error.message);
  }

  return (data as WorkflowRow[]).map(rowToWorkflow);
}

/**
 * Update workflow metadata only
 */
export async function updateWorkflowMetadata(
  supabase: SupabaseClient,
  id: string,
  metadata: Partial<Workflow['metadata']>
): Promise<void> {
  const { error } = await supabase
    .from('workflows')
    .update({ metadata })
    .eq('id', id);

  if (error) {
    console.error('Error updating workflow metadata:', error);
    throw new Error(error.message);
  }
}
