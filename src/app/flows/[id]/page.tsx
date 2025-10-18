"use client";

import { useEffect, useState, useRef } from "react";
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
  // Refs to prevent re-render loops and duplicate workflow creation
  const workflowCreatedRef = useRef(false);
  const hasNavigatedFromNewRef = useRef(false);

  const workflow = useWorkflowStore((state) => state.workflow);
  const createWorkflow = useWorkflowStore((state) => state.createWorkflow);
  const loadWorkflow = useWorkflowStore((state) => state.loadWorkflow);
  const clearWorkflow = useWorkflowStore((state) => state.clearWorkflow);
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

  // Auto-save integration with callback for navigation after first save
  const { saveWorkflow, isSaved } = useWorkflowPersistence({
    autoSave: true,
    autoSaveDelay: 1000, // Faster autosave for better UX (1 second)
    userId: user?.id || null,
    workflowId: workflowId, // Pass current route ID for validation
    onFirstSave: (savedWorkflow) => {
      // FIGMA-LIKE: Only navigate to the permanent URL after first successful save
      if (workflowId === "new" && !hasNavigatedFromNewRef.current) {
        console.log("✅ First save complete, navigating to:", savedWorkflow.id);
        hasNavigatedFromNewRef.current = true;
        router.replace(`/flows/${savedWorkflow.id}`, { scroll: false });
      }
    },
  });

  // Workflow loading logic - Figma-like approach
  useEffect(() => {
    async function loadWorkflowData() {
      if (userLoading || !user) return;

      // CRITICAL: Clear workflow store at the start to prevent cross-contamination
      // This ensures clean state when switching between workflows
      console.log("🧹 Clearing workflow store for fresh load");
      clearWorkflow();

      // Handle new workflow creation
      if (workflowId === "new") {
        // CRITICAL: Only create workflow once using ref guard
        if (!workflowCreatedRef.current) {
          console.log("📝 Creating new workflow (stays on /new until saved)");
          workflowCreatedRef.current = true;
          createWorkflow("Untitled Workflow", "A new workflow");
        }
        setLoadingWorkflow(false);
        return;
      }

      // Handle loading existing workflow
      try {
        setLoadingWorkflow(true);
        setLoadError(null);

        const supabase = createClient();
        const workflowData = await getWorkflow(supabase, workflowId);

        if (workflowData) {
          console.log("📖 Loading workflow:", workflowData.name);
          loadWorkflow(workflowData);
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
    
    // Cleanup function: Reset guards when workflowId changes
    return () => {
      // Reset creation guards
      workflowCreatedRef.current = false;
      hasNavigatedFromNewRef.current = false;
    };
  }, [workflowId, user, userLoading, createWorkflow, loadWorkflow, clearWorkflow]);

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
