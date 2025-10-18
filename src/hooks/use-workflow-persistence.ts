import { useEffect, useRef, useCallback } from 'react';
import { useDebounce } from 'use-debounce';
import { createClient } from '@/lib/supabase/client';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { WorkflowSchema } from '@/lib/schemas/workflow-schema';
import type { Workflow } from '@/types/workflow';
import { ZodError } from 'zod';
import { toast } from 'sonner';

// Global save lock to prevent concurrent saves of the same workflow
// Using both a promise map and a simple boolean lock for synchronous checking
const activeSaves = new Map<string, Promise<void>>();
const saveLocks = new Map<string, boolean>();

// Hash-based workflow comparison for performance
function hashWorkflow(workflow: Workflow | null): string {
  if (!workflow) return '';
  return `${workflow.id}-${workflow.nodes.length}-${workflow.edges.length}-${workflow.updatedAt}`;
}

function isWorkflowEmpty(workflow: Workflow | null): boolean {
  if (!workflow) return true;

  const hasStructure = workflow.nodes.length > 0 || workflow.edges.length > 0;

  // Ignore default description "A new workflow" when checking if workflow is empty
  const defaultDescription = "a new workflow";
  const hasCustomDescription =
    workflow.description?.trim() &&
    workflow.description.trim().toLowerCase() !== defaultDescription;

  const hasCustomName =
    workflow.name.trim().toLowerCase() !== "untitled workflow";

  // Check if viewport has been modified from default
  const hasModifiedViewport =
    workflow.viewport.x !== 0 ||
    workflow.viewport.y !== 0 ||
    workflow.viewport.zoom !== 1;

  return !hasStructure && !hasDescription && !hasCustomName && !hasModifiedViewport;
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

  // Manual save function
  const saveWorkflow = useCallback(async (retries = 3): Promise<void> => {
    if (!workflow || !userId) {
      console.log('⏭️ Skipping save: no workflow or userId', {
        hasWorkflow: !!workflow,
        userId
      });
      // Show toast if userId is missing (session expired)
      if (!userId && workflow) {
        toast.error('Session expired. Please sign in again to save your work.');
      }
      return;
    }

      const workflowId = workflow.id;

    // ATOMIC LOCK ACQUISITION - Check and set in one operation
    if (saveLocks.get(workflowId)) {
      console.log('⏭️ Skipping save: save already in progress for workflow', workflowId);
      return activeSaves.get(workflowId);
    }

    // Immediately acquire lock before any async operations
    saveLocks.set(workflowId, true);

      console.log(
        "🔄 Starting save for workflow:",
        workflow.name,
        "userId:",
        userId
      );
      setSaveStatus(true, null, null);

      // Create client inside callback to ensure it has current auth session
      const supabase = createClient();

      const savePromise = (async () => {
        try {
          // First, validate the workflow structure
          const validationResult = WorkflowSchema.safeParse(workflow);

          if (!validationResult.success) {
            console.error(
              "❌ Validation failed:",
              validationResult.error.issues
            );
            throw validationResult.error;
          }

          const workflowToPersist = validationResult.data;

          const { data, error } = await supabase
            .from("workflows")
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
            console.error("❌ Supabase error:", {
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code,
            });
            throw error;
          }

          // Verify save by checking returned data
          if (!data) {
            throw new Error("Save succeeded but no data returned");
          }

          // Verify critical fields match
          if (data.id !== workflowToPersist.id) {
            throw new Error("Save verification failed: ID mismatch");
          }

        // Critical: Node count mismatch indicates data loss
        if (data.nodes.length !== workflowToPersist.nodes.length) {
          const errorMsg = `Node count mismatch: expected ${workflowToPersist.nodes.length}, got ${data.nodes.length}`;
          console.error('❌', errorMsg);
          toast.error('Save verification failed. Your data may not have been saved correctly.');
          throw new Error(errorMsg);
        }

          lastSavedWorkflow.current = workflow;
          setSaveStatus(false, null, new Date().toISOString());

        console.log('✅ Workflow saved and verified:', workflow.name, 'at', new Date().toLocaleTimeString());
      } catch (error: unknown) {
        if (retries > 0) {
          console.warn(`⚠️ Save failed, retrying... (${retries} attempts left)`);
          // Clean up locks before retry
          activeSaves.delete(workflowId);
          saveLocks.delete(workflowId);

          // FIXED: Properly await retry with Promise wrapper
          return new Promise<void>((resolve) => {
            setTimeout(async () => {
              try {
                await saveWorkflow(retries - 1);
                resolve();
              } catch (retryError) {
                // Error will be handled in final catch below
                throw retryError;
              }
            }, 2000);
          });
        } else {
          // Final retry failed - show user-facing errors
          if (error instanceof ZodError) {
            const errorDetails = error.issues.map(issue => ({
              path: issue.path.join('.'),
              message: issue.message,
              code: issue.code,
            }));
            console.error('❌ Validation failed after retries:', errorDetails);
            toast.error('Failed to save workflow: Invalid data structure');
            setSaveStatus(false, 'Data validation failed.', null);
          } else if (error instanceof Error) {
            console.error('❌ Save failed after retries:', error);
            toast.error(`Failed to save workflow: ${error.message}`);
            setSaveStatus(false, error.message || 'Failed to save workflow', null);
          } else {
            console.error('❌ Unknown save error:', error);
            toast.error('Failed to save workflow: Unknown error');
            setSaveStatus(false, 'An unknown error occurred while saving.', null);
          }
        }
      } finally {
        // Clean up the active save lock and promise
        activeSaves.delete(workflowId);
        saveLocks.delete(workflowId);
      }
    })();

      // Register this save as active
      activeSaves.set(workflowId, savePromise);

      return savePromise;
    },
    [workflow, userId, setSaveStatus]
  );

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

    // FIXED: Use hash comparison instead of JSON.stringify for performance
    if (lastSavedWorkflow.current && debouncedWorkflow) {
      const currentHash = hashWorkflow(debouncedWorkflow);
      const savedHash = hashWorkflow(lastSavedWorkflow.current);

      if (currentHash === savedHash) {
        return; // No changes detected
      }
    }

    // Check if this workflow is already being saved BEFORE calling saveWorkflow
    if (saveLocks.get(debouncedWorkflow.id)) {
      console.log(
        "⏭️ Skipping auto-save: save already in progress for workflow",
        debouncedWorkflow.id
      );
      return;
    }

    // Auto-save the workflow
    saveWorkflow();
  }, [debouncedWorkflow, autoSave, userId, saveWorkflow]);

  // Cleanup on unmount - FIXED: Clean up memory leaks
  useEffect(() => {
    const currentWorkflowId = workflow?.id;

    return () => {
      isInitialMount.current = true;
      lastSavedWorkflow.current = null;

      // Clean up global maps for this workflow to prevent memory leaks
      if (currentWorkflowId) {
        activeSaves.delete(currentWorkflowId);
        saveLocks.delete(currentWorkflowId);
      }
    };
  }, [workflow?.id]);

  return {
    saveWorkflow,
  };
}
