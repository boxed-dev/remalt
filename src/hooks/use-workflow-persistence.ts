import { useEffect, useRef, useCallback } from "react";
import { useDebounce } from "use-debounce";
import { createClient } from "@/lib/supabase/client";
import { useWorkflowStore } from "@/lib/stores/workflow-store";
import { WorkflowSchema } from "@/lib/schemas/workflow-schema";
import type { Workflow } from "@/types/workflow";
import { ZodError } from "zod";

// Global save lock to prevent concurrent saves of the same workflow
// Using both a promise map and a simple boolean lock for synchronous checking
const activeSaves = new Map<string, Promise<void>>();
const saveLocks = new Map<string, boolean>();

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

  // A workflow is empty if it has no structure AND no custom description AND no custom name
  return !hasStructure && !hasCustomDescription && !hasCustomName;
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
  const saveWorkflow = useCallback(
    async (retries = 3) => {
      if (!workflow || !userId) {
        console.log("⏭️ Skipping save: no workflow or userId", {
          hasWorkflow: !!workflow,
          userId,
        });
        return;
      }

      // Skip saving empty workflows (0 nodes, default name/description)
      if (isWorkflowEmpty(workflow)) {
        console.log("⏭️ Skipping save: workflow is empty", {
          name: workflow.name,
          nodeCount: workflow.nodes.length,
        });
        return;
      }

      const workflowId = workflow.id;

      // Synchronous lock check - if locked, skip immediately
      if (saveLocks.get(workflowId)) {
        console.log(
          "⏭️ Skipping save: save already in progress for workflow",
          workflowId,
          "(locked)"
        );
        // Return the existing promise if available
        return activeSaves.get(workflowId);
      }

      // Check if there's already an active save for this workflow
      const existingSave = activeSaves.get(workflowId);
      if (existingSave) {
        console.log(
          "⏭️ Skipping save: save already in progress for workflow",
          workflowId,
          "(promise exists)"
        );
        return existingSave; // Return the existing promise
      }

      // Acquire the lock IMMEDIATELY before any async operations
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

          if (data.nodes.length !== workflowToPersist.nodes.length) {
            console.warn("⚠️ Node count mismatch after save:", {
              expected: workflowToPersist.nodes.length,
              actual: data.nodes.length,
            });
          }

          lastSavedWorkflow.current = workflow;
          setSaveStatus(false, null, new Date().toISOString());

          console.log(
            "✅ Workflow saved and verified:",
            workflow.name,
            "at",
            new Date().toLocaleTimeString()
          );
        } catch (error: unknown) {
          if (retries > 0) {
            console.warn(
              `⚠️ Save failed, retrying... (${retries} attempts left)`
            );
            // Remove from active saves and locks before retrying
            activeSaves.delete(workflowId);
            saveLocks.delete(workflowId);
            setTimeout(() => saveWorkflow(retries - 1), 2000); // Wait 2 seconds before retrying
          } else {
            if (error instanceof ZodError) {
              console.error(
                "❌ Zod validation failed after multiple retries:",
                error.issues.map((issue) => ({
                  path: issue.path.join("."),
                  message: issue.message,
                  code: issue.code,
                }))
              );
              setSaveStatus(
                false,
                "Data validation failed. Check console for details.",
                null
              );
            } else if (error instanceof Error) {
              console.error(
                "❌ Failed to save workflow after multiple retries:",
                {
                  error,
                  message: error.message,
                  stack: error.stack,
                }
              );
              setSaveStatus(
                false,
                error.message || "Failed to save workflow",
                null
              );
            } else {
              console.error(
                "❌ Failed to save workflow after multiple retries with unknown error:",
                error
              );
              setSaveStatus(
                false,
                "An unknown error occurred while saving.",
                null
              );
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

    // Skip if workflow hasn't changed
    if (lastSavedWorkflow.current && debouncedWorkflow) {
      if (
        JSON.stringify(lastSavedWorkflow.current) ===
        JSON.stringify(debouncedWorkflow)
      ) {
        return;
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

  // Flush pending saves when tab loses visibility (Figma-style behavior)
  // This ensures that unsaved changes are persisted even if the user quickly switches tabs
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        // Tab is being hidden - flush any pending saves immediately
        if (workflow && userId && !isWorkflowEmpty(workflow)) {
          // Check if there's unsaved work by comparing with last saved version
          const hasUnsavedChanges =
            !lastSavedWorkflow.current ||
            JSON.stringify(lastSavedWorkflow.current) !==
              JSON.stringify(workflow);

          if (hasUnsavedChanges && !saveLocks.get(workflow.id)) {
            console.log(
              "👁️ Tab losing visibility - flushing pending saves for:",
              workflow.name
            );
            saveWorkflow();
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [workflow, userId, saveWorkflow]);

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
