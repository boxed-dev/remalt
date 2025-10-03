import { useEffect, useRef, useCallback } from 'react';
import { useDebounce } from 'use-debounce';
import { createClient } from '@/lib/supabase/client';
import { updateWorkflow, createWorkflow } from '@/lib/supabase/workflows';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import type { Workflow } from '@/types/workflow';

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
  const lastSavedWorkflow = useRef<Workflow | null>(null);
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
      // Use upsert to handle both create and update
      const { data, error } = await supabase
        .from('workflows')
        .upsert({
          id: workflow.id,
          user_id: userId,
          name: workflow.name,
          description: workflow.description || null,
          nodes: workflow.nodes,
          edges: workflow.edges,
          viewport: workflow.viewport,
          metadata: workflow.metadata,
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

      lastSavedWorkflow.current = workflow;
      setSaveStatus(false, null, new Date().toISOString());

      console.log('✅ Workflow saved:', workflow.name, 'at', new Date().toLocaleTimeString());
    } catch (error: any) {
      console.error('❌ Failed to save workflow:', {
        error,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        type: typeof error,
        stringified: JSON.stringify(error)
      });
      setSaveStatus(false, error?.message || error?.details || 'Failed to save workflow', null);
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

    // Skip if workflow hasn't changed
    if (lastSavedWorkflow.current &&
        JSON.stringify(lastSavedWorkflow.current) === JSON.stringify(debouncedWorkflow)) {
      return;
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
