"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { WorkflowCanvas } from "@/components/workflow/WorkflowCanvas";
import { DifyWorkflowHeader } from "@/components/workflow/DifyWorkflowHeader";
import { DifyWorkflowSidebar } from "@/components/workflow/DifyWorkflowSidebar";
import { StickyNoteOverlay } from "@/components/workflow/StickyNoteOverlay";
import { useWorkflowStore } from "@/lib/stores/workflow-store";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useWorkflowPersistence } from "@/hooks/use-workflow-persistence";
import { createClient } from "@/lib/supabase/client";
import { getWorkflow } from "@/lib/supabase/workflows";
import { Loader2 } from "lucide-react";

export default function WorkflowEditorPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;
  const { user, loading: userLoading } = useCurrentUser();

  const [loadingWorkflow, setLoadingWorkflow] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(
    null
  );

  const workflow = useWorkflowStore((state) => state.workflow);
  const createWorkflow = useWorkflowStore((state) => state.createWorkflow);
  const loadWorkflow = useWorkflowStore((state) => state.loadWorkflow);
  const selectedNodes = useWorkflowStore((state) => state.selectedNodes);
  const copyNodes = useWorkflowStore((state) => state.copyNodes);
  const duplicateNode = useWorkflowStore((state) => state.duplicateNode);
  const addNode = useWorkflowStore((state) => state.addNode);
  const undo = useWorkflowStore((state) => state.undo);
  const redo = useWorkflowStore((state) => state.redo);
  const setControlMode = useWorkflowStore((state) => state.setControlMode);

  // Debug user state
  useEffect(() => {
    console.log("🔐 User state:", {
      user: user?.id,
      email: user?.email,
      loading: userLoading,
    });
  }, [user, userLoading]);

  // Auto-save integration
  const { saveWorkflow } = useWorkflowPersistence({
    autoSave: true,
    autoSaveDelay: 2000,
    userId: user?.id || null,
  });

  // Reset redirect flag when navigating to /new to prevent stale redirects
  useEffect(() => {
    if (workflowId === "new") {
      setHasRedirected(false);
      setCurrentWorkflowId(null); // Clear current workflow ID tracker
    }
  }, [workflowId]);

  // Handle redirect from /flows/new to /flows/[id] after first save
  useEffect(() => {
    // Only redirect if:
    // 1. We're on the /flows/new route
    // 2. We have a workflow with an actual ID
    // 3. We haven't already redirected
    // 4. The workflow has been saved (has nodes or edges)
    // 5. The workflow ID matches the one we're currently editing (not a stale workflow)
    if (
      workflowId === "new" &&
      workflow?.id &&
      !hasRedirected &&
      (workflow.nodes.length > 0 || workflow.edges.length > 0) &&
      workflow.id === currentWorkflowId // Only redirect if this matches the workflow we just created
    ) {
      console.log("🔄 Redirecting from /flows/new to /flows/" + workflow.id);
      setHasRedirected(true);
      // Use push instead of replace to avoid full page reload (janky UX)
      // Update the URL without reloading the page
      window.history.replaceState(null, "", `/flows/${workflow.id}`);
    }
  }, [workflowId, workflow, hasRedirected, currentWorkflowId]);

  // Load workflow from Supabase
  useEffect(() => {
    async function loadWorkflowData() {
      if (userLoading || !user) return;

      // Check if this is a "new" workflow request
      if (workflowId === "new") {
        // Clear any existing workflow state to prevent redirect to old workflow
        const currentWorkflow = useWorkflowStore.getState().workflow;
        if (currentWorkflow) {
          useWorkflowStore.getState().clearWorkflow();
        }
        createWorkflow("Untitled Workflow", "A new workflow");
        // Get the newly created workflow's ID and track it
        const newlyCreatedWorkflow = useWorkflowStore.getState().workflow;
        if (newlyCreatedWorkflow) {
          setCurrentWorkflowId(newlyCreatedWorkflow.id);
        }
        setLoadingWorkflow(false);
        return;
      }

      // CRITICAL FIX: Prevent reloading workflow if we already have it in memory
      // This prevents race conditions when switching tabs while auto-save is in progress
      const currentWorkflow = useWorkflowStore.getState().workflow;
      if (currentWorkflow && currentWorkflow.id === workflowId) {
        console.log("✅ Workflow already loaded in memory, skipping fetch:", workflowId);
        setLoadingWorkflow(false);
        return;
      }

      try {
        setLoadingWorkflow(true);
        setLoadError(null);

        const supabase = createClient();
        const workflowData = await getWorkflow(supabase, workflowId);

        if (workflowData) {
          loadWorkflow(workflowData);
          setCurrentWorkflowId(workflowData.id);
        } else {
          setLoadError("Workflow not found");
        }
      } catch (error) {
        console.error("Failed to load workflow:", error);
        setLoadError(
          error instanceof Error ? error.message : "Failed to load workflow"
        );
      } finally {
        setLoadingWorkflow(false);
      }
    }

    loadWorkflowData();
  }, [workflowId, user, userLoading, createWorkflow, loadWorkflow]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    "mod+s": () => {
      // Manual save
      saveWorkflow();
    },
    "mod+z": () => {
      // Undo
      undo();
    },
    "mod+shift+z": () => {
      // Redo
      redo();
    },
    "mod+d": () => {
      // Duplicate selected node
      if (selectedNodes.length === 1) {
        duplicateNode(selectedNodes[0]);
      }
    },
    "mod+c": () => {
      // Copy selected nodes
      if (selectedNodes.length > 0) {
        copyNodes(selectedNodes);
      }
    },
    escape: () => {
      // Clear selection
      if (selectedNodes.length > 0) {
        useWorkflowStore.getState().clearSelection();
      }
    },
    // Add node shortcuts
    c: () => addNode("chat", { x: 100, y: 100 }),
    s: () => addNode("template", { x: 100, y: 100 }),
    r: () => addNode("voice", { x: 100, y: 100 }),
    i: () => addNode("image", { x: 100, y: 100 }),
    t: () => addNode("text", { x: 100, y: 100 }),
    a: () => addNode("connector", { x: 100, y: 100 }),
    w: () => addNode("webpage", { x: 100, y: 100 }),
    d: () => addNode("pdf", { x: 100, y: 100 }),
    // Zoom shortcuts
    "=": () => {
      // Will be handled by ReactFlow controls
    },
    "-": () => {
      // Will be handled by ReactFlow controls
    },
    "1": () => {
      // Will be handled by ReactFlow controls
    },
    // Control mode shortcuts
    v: () => setControlMode("pointer"),
    h: () => setControlMode("hand"),
  });

  // Loading states
  if (userLoading || loadingWorkflow) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#FAFBFC]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#007AFF] mx-auto mb-4" />
          <p className="text-[14px] text-[#6B7280]">Loading workflow...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (loadError) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#FAFBFC]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-[20px] font-semibold text-[#1A1D21] mb-2">
            Failed to load workflow
          </h2>
          <p className="text-[14px] text-[#6B7280] mb-6">{loadError}</p>
          <button
            onClick={() => router.push("/flows")}
            className="px-6 py-2.5 bg-[#007AFF] text-white rounded-lg font-medium text-[14px] hover:bg-[#0051D5] transition-all"
          >
            Back to Flows
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-[#F3F4F6]">
      {/* Dify-style workflow header */}
      <div className="flex-shrink-0">
        <DifyWorkflowHeader />
      </div>

      {/* Main content - canvas with floating sidebar */}
      <div className="flex-1 relative overflow-hidden">
        <WorkflowCanvas />

        {/* Floating Dify-style Sidebar */}
        <DifyWorkflowSidebar />

        {/* Sticky Notes Overlay - disabled by default, can be enabled via props */}
        <StickyNoteOverlay enabled={false} notes={[]} />
      </div>
    </div>
  );
}
