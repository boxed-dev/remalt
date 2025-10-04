import { useEffect, useRef, useCallback } from 'react';
import { useDebounce } from 'use-debounce';
import { createClient } from '@/lib/supabase/client';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import type {
  Workflow,
  WorkflowNode,
  NodeData,
  NodeType,
  WorkflowEdge,
} from '@/types/workflow';

type SerializableWorkflow = Omit<Workflow, 'nodes' | 'edges'> & {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof File !== 'undefined' && value instanceof File) {
    return undefined;
  }

  if (typeof value === 'string' && value.startsWith('blob:')) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeValue(item))
      .filter((item) => item !== undefined);
  }

  if (typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      const serialized = sanitizeValue(val);
      if (serialized !== undefined) {
        sanitized[key] = serialized;
      }
    }
    return sanitized;
  }

  return value;
}

function sanitizeNodeData(_type: NodeType, data: NodeData): NodeData {
  return sanitizeValue(data) as NodeData;
}

function sanitizeWorkflow(workflow: Workflow): SerializableWorkflow {
  const sanitizedNodes = workflow.nodes.map((node) => ({
    ...node,
    data: sanitizeNodeData(node.type, node.data),
    metadata: node.metadata ? sanitizeValue(node.metadata) : undefined,
    style: node.style ? sanitizeValue(node.style) : undefined,
  }));

  const sanitizedEdges = workflow.edges.map((edge) => ({
    ...edge,
    data: edge.data ? (sanitizeValue(edge.data) as WorkflowEdge['data']) : undefined,
    style: edge.style ? sanitizeValue(edge.style) : undefined,
  }));

  return {
    ...workflow,
    nodes: sanitizedNodes,
    edges: sanitizedEdges,
  };
}

function isWorkflowEmpty(workflow: Workflow | null): boolean {
  if (!workflow) return true;

  const hasStructure = workflow.nodes.length > 0 || workflow.edges.length > 0;
  const hasDescription = Boolean(workflow.description?.trim());
  const hasCustomName = workflow.name.trim().toLowerCase() !== 'untitled workflow';

  return !hasStructure && !hasDescription && !hasCustomName;
}

interface UseWorkflowPersistenceOptions {
  autoSave?: boolean;
  autoSaveDelay?: number;
  userId: string | null;
}

export function useWorkflowPersistence({
  autoSave = true,
  autoSaveDelay = 2000, // 2 seconds debounce
  userId,
}: UseWorkflowPersistenceOptions) {
  const workflow = useWorkflowStore((state) => state.workflow);
  const setSaveStatus = useWorkflowStore((state) => state.setSaveStatus);

  const [debouncedWorkflow] = useDebounce(workflow, autoSaveDelay);
  const isInitialMount = useRef(true);
  const lastSavedWorkflow = useRef<SerializableWorkflow | null>(null);
  const supabase = createClient();

  // Manual save function
  const saveWorkflow = useCallback(async () => {
    if (!workflow || !userId) {
      console.log('⏭️ Skipping save: no workflow or userId', {
        hasWorkflow: !!workflow,
        userId
      });
      return;
    }

    console.log('🔄 Starting save for workflow:', workflow.name, 'userId:', userId);
    setSaveStatus(true, null, null);

    try {
      const workflowToPersist = sanitizeWorkflow(workflow);

      // Use upsert to handle both create and update
      const { data, error } = await supabase
        .from('workflows')
        .upsert({
          id: workflowToPersist.id,
          user_id: userId,
          name: workflowToPersist.name,
          description: workflowToPersist.description || null,
          nodes: workflowToPersist.nodes,
          edges: workflowToPersist.edges,
          viewport: workflowToPersist.viewport,
          metadata: workflowToPersist.metadata,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        });
        throw error;
      }

      lastSavedWorkflow.current = workflowToPersist;
      setSaveStatus(false, null, new Date().toISOString());

      console.log('✅ Workflow saved:', workflow.name, 'at', new Date().toLocaleTimeString());
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('❌ Failed to save workflow:', {
          error,
          message: error.message,
          stack: error.stack,
        });
        setSaveStatus(false, error.message || 'Failed to save workflow', null);
      } else {
        console.error('❌ Failed to save workflow:', error);
        setSaveStatus(false, 'Failed to save workflow', null);
      }
    }
  }, [workflow, userId, supabase, setSaveStatus]);

  // Auto-save effect
  useEffect(() => {
    // Skip auto-save on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Skip if auto-save is disabled
    if (!autoSave || !debouncedWorkflow || !userId) {
      return;
    }

    if (isWorkflowEmpty(debouncedWorkflow)) {
      return;
    }

    // Skip if workflow hasn't changed
    if (lastSavedWorkflow.current && debouncedWorkflow) {
      const sanitizedDebounced = sanitizeWorkflow(debouncedWorkflow);
      if (JSON.stringify(lastSavedWorkflow.current) === JSON.stringify(sanitizedDebounced)) {
        return;
      }
    }

    // Auto-save the workflow
    saveWorkflow();
  }, [debouncedWorkflow, autoSave, userId, saveWorkflow]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isInitialMount.current = true;
      lastSavedWorkflow.current = null;
    };
  }, []);

  return {
    saveWorkflow,
  };
}
