import { useEffect, useRef, useCallback } from 'react';
import { useDebounce } from 'use-debounce';
import { createClient } from '@/lib/supabase/client';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { WorkflowSchema } from '@/lib/schemas/workflow-schema';
import type { Workflow } from '@/types/workflow';
import { ZodError } from 'zod';

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
  const lastSavedWorkflow = useRef<Workflow | null>(null);
  const supabase = createClient();

  // Manual save function
  const saveWorkflow = useCallback(async (retries = 3) => {
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
      // First, validate the workflow structure
      const validationResult = WorkflowSchema.safeParse(workflow);

      if (!validationResult.success) {
        console.error('❌ Validation failed:', validationResult.error.issues);
        throw validationResult.error;
      }

      const workflowToPersist = validationResult.data;

      const { data, error } = await supabase
        .from('workflows')
        .upsert({
          id: workflowToPersist.id,
          user_id: userId,
          name: workflowToPersist.name,
          description: workflowToPersist.description || null,
          nodes: workflowToPersist.nodes as any,
          edges: workflowToPersist.edges as any,
          viewport: workflowToPersist.viewport as any,
          metadata: workflowToPersist.metadata as any,
          // Note: updated_at is auto-set by database trigger
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }

      // Verify save by checking returned data
      if (!data) {
        throw new Error('Save succeeded but no data returned');
      }

      // Verify critical fields match
      if (data.id !== workflowToPersist.id) {
        throw new Error('Save verification failed: ID mismatch');
      }

      if (data.nodes.length !== workflowToPersist.nodes.length) {
        console.warn('⚠️ Node count mismatch after save:', {
          expected: workflowToPersist.nodes.length,
          actual: data.nodes.length
        });
      }

      lastSavedWorkflow.current = workflow;
      setSaveStatus(false, null, new Date().toISOString());

      console.log('✅ Workflow saved and verified:', workflow.name, 'at', new Date().toLocaleTimeString());
    } catch (error: unknown) {
      if (retries > 0) {
        console.warn(`⚠️ Save failed, retrying... (${retries} attempts left)`);
        setTimeout(() => saveWorkflow(retries - 1), 2000); // Wait 2 seconds before retrying
      } else {
        if (error instanceof ZodError) {
          console.error('❌ Zod validation failed after multiple retries:',
            error.issues.map(issue => ({
              path: issue.path.join('.'),
              message: issue.message,
              code: issue.code,
            }))
          );
          setSaveStatus(false, 'Data validation failed. Check console for details.', null);
        } else if (error instanceof Error) {
          console.error('❌ Failed to save workflow after multiple retries:', {
            error,
            message: error.message,
            stack: error.stack,
          });
          setSaveStatus(false, error.message || 'Failed to save workflow', null);
        } else {
          console.error('❌ Failed to save workflow after multiple retries with unknown error:', error);
          setSaveStatus(false, 'An unknown error occurred while saving.', null);
        }
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
      if (JSON.stringify(lastSavedWorkflow.current) === JSON.stringify(debouncedWorkflow)) {
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
