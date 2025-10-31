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
 * Delete a workflow (and associated notes via CASCADE)
 * Note: workflow_notes has ON DELETE CASCADE foreign key,
 * so notes are automatically deleted when workflow is deleted
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

  // Notes are automatically deleted via CASCADE foreign key constraint
  console.log('✅ Workflow and associated notes deleted:', id);
}

/**
 * Duplicate a workflow
 * IMPORTANT: Duplicated workflows are always private (isPublic: false)
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
  // CRITICAL: Always set isPublic to false for duplicates
  const duplicate: Workflow = {
    ...original,
    id: crypto.randomUUID(),
    name: newName || `${original.name} (Copy)`,
    metadata: {
      ...original.metadata,
      isPublic: false, // Always private when duplicated
    },
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

/**
 * Public template summary with author information
 */
export type PublicTemplateSummary = WorkflowSummary & {
  authorName: string | null;
  authorEmail: string;
  userId: string;
};

/**
 * Fetch all public templates (workflows with isPublic=true)
 * Includes author information from profiles table
 * No authentication required - accessible to all users
 */
export async function getPublicTemplates(supabase: SupabaseClient): Promise<PublicTemplateSummary[]> {
  console.log('🔍 Fetching public templates...');

  const { data, error } = await supabase
    .from('workflows')
    .select(`
      id,
      name,
      description,
      nodes,
      metadata,
      created_at,
      updated_at,
      user_id,
      profiles!inner (
        email,
        full_name
      )
    `)
    .eq('metadata->isPublic', true)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching public templates:', error);
    throw new Error(error.message);
  }

  console.log(`✅ Found ${data?.length || 0} public templates`);
  if (data && data.length > 0) {
    console.log('📋 Template IDs:', data.map(t => t.id));
  }

  if (!data) return [];

  return data.map((row: any) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    nodeCount: Array.isArray(row.nodes) ? row.nodes.length : 0,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    metadata: row.metadata || {
      version: '1.0.0',
      tags: [],
      isPublic: true,
    },
    authorName: row.profiles?.full_name || null,
    authorEmail: row.profiles?.email || 'Unknown',
    userId: row.user_id,
  }));
}

/**
 * Fetch public templates filtered by category
 * @param supabase - Supabase client
 * @param category - Template category to filter by
 */
export async function getPublicTemplatesByCategory(
  supabase: SupabaseClient,
  category: string
): Promise<PublicTemplateSummary[]> {
  const { data, error } = await supabase
    .from('workflows')
    .select(`
      id,
      name,
      description,
      nodes,
      metadata,
      created_at,
      updated_at,
      user_id,
      profiles!inner (
        email,
        full_name
      )
    `)
    .eq('metadata->isPublic', true)
    .eq('metadata->>category', category)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching templates by category:', error);
    throw new Error(error.message);
  }

  if (!data) return [];

  return data.map((row: any) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    nodeCount: Array.isArray(row.nodes) ? row.nodes.length : 0,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    metadata: row.metadata || {
      version: '1.0.0',
      tags: [],
      isPublic: true,
    },
    authorName: row.profiles?.full_name || null,
    authorEmail: row.profiles?.email || 'Unknown',
    userId: row.user_id,
  }));
}

/**
 * Publish a workflow as a public template
 * Updates metadata.isPublic to true and adds publishing metadata
 * @param supabase - Supabase client
 * @param id - Workflow ID
 * @param userId - User ID (must match workflow owner)
 * @param publishMetadata - Additional metadata for publishing (category, tags, etc.)
 */
export async function publishWorkflow(
  supabase: SupabaseClient,
  id: string,
  userId: string,
  publishMetadata: {
    category?: string;
    tags?: string[];
    authorEmail: string;
    authorName?: string;
  }
): Promise<void> {
  console.log('📝 Publishing workflow:', id);

  // First, verify the workflow exists and belongs to the user
  const workflow = await getWorkflow(supabase, id);
  if (!workflow) {
    throw new Error('Workflow not found');
  }

  // Update metadata with public flag and publishing info
  const updatedMetadata = {
    ...workflow.metadata,
    isPublic: true,
    category: publishMetadata.category,
    tags: publishMetadata.tags || workflow.metadata.tags,
    author: publishMetadata.authorName,
    authorEmail: publishMetadata.authorEmail,
    publishedAt: new Date().toISOString(),
  };

  console.log('📋 Updated metadata:', JSON.stringify(updatedMetadata, null, 2));

  const { error } = await supabase
    .from('workflows')
    .update({ metadata: updatedMetadata })
    .eq('id', id)
    .eq('user_id', userId); // Security: ensure user owns the workflow

  if (error) {
    console.error('❌ Error publishing workflow:', error);
    throw new Error(error.message);
  }

  console.log('✅ Workflow published as template:', id);
}

/**
 * Unpublish a template (set isPublic to false)
 * @param supabase - Supabase client
 * @param id - Workflow ID
 * @param userId - User ID (must match workflow owner)
 */
export async function unpublishWorkflow(
  supabase: SupabaseClient,
  id: string,
  userId: string
): Promise<void> {
  // First, verify the workflow exists and belongs to the user
  const workflow = await getWorkflow(supabase, id);
  if (!workflow) {
    throw new Error('Workflow not found');
  }

  // Update metadata to set isPublic to false
  const updatedMetadata = {
    ...workflow.metadata,
    isPublic: false,
  };

  const { error } = await supabase
    .from('workflows')
    .update({ metadata: updatedMetadata })
    .eq('id', id)
    .eq('user_id', userId); // Security: ensure user owns the workflow

  if (error) {
    console.error('Error unpublishing workflow:', error);
    throw new Error(error.message);
  }

  console.log('✅ Workflow unpublished:', id);
}
