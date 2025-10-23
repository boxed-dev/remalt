"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { WorkflowCanvas } from "@/components/workflow/WorkflowCanvas";
import { DifyWorkflowHeader } from "@/components/workflow/DifyWorkflowHeader";
import { DifyWorkflowSidebar } from "@/components/workflow/DifyWorkflowSidebar";
import { StickyNoteOverlay } from "@/components/workflow/StickyNoteOverlay";
import { NotesPanel } from "@/components/workflow/NotesPanel";
import { NotesPanel } from "@/components/workflow/NotesPanel";
import { useWorkflowStore } from "@/lib/stores/workflow-store";
import { useNotesStore } from "@/lib/stores/notes-store";
import { useNotesStore } from "@/lib/stores/notes-store";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useWorkflowPersistence } from "@/hooks/use-workflow-persistence";
import { usePageVisibility } from "@/hooks/use-page-visibility";
import { createClient } from "@/lib/supabase/client";
import { getWorkflow } from "@/lib/supabase/workflows";
import { LoadingScreen } from "@/components/ui/loading";
import { FileText } from "lucide-react";

export default function WorkflowEditorPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;
  const { user, loading: userLoading } = useCurrentUser();
  const isPageVisible = usePageVisibility();

  const [loadingWorkflow, setLoadingWorkflow] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Use notes store for panel state
  const { isOpen: isNotesPanelOpen, setOpen: setIsNotesPanelOpen } = useNotesStore();
  
  
  // Use notes store for panel state
  const { isOpen: isNotesPanelOpen, setOpen: setIsNotesPanelOpen } = useNotesStore();
  
  // Refs to prevent re-render loops and duplicate workflow creation
  const workflowCreatedRef = useRef(false);
  const hasNavigatedFromNewRef = useRef(false);
  // FIGMA-STYLE: Track actual loaded workflow ID to prevent reloading on URL change
  const loadedWorkflowIdRef = useRef<string | null>(null);

  const workflow = useWorkflowStore((state) => state.workflow);
  const createWorkflow = useWorkflowStore((state) => state.createWorkflow);
  const loadWorkflow = useWorkflowStore((state) => state.loadWorkflow);
  const clearWorkflow = useWorkflowStore((state) => state.clearWorkflow);
  const selectedNodes = useWorkflowStore((state) => state.selectedNodes);
  const copyNodes = useWorkflowStore((state) => state.copyNodes);
  const duplicateNode = useWorkflowStore((state) => state.duplicateNode);
  const addNode = useWorkflowStore((state) => state.addNode);
  const undo = useWorkflowStore((state) => state.undo);
  const redo = useWorkflowStore ((state) => state.redo);
  const redo = useWorkflowStore ((state) => state.redo);
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
      // FIGMA-STYLE: Silent URL update without page reload
      // This changes the URL from /flows/new to /flows/{id} seamlessly
      if (workflowId === "new" && !hasNavigatedFromNewRef.current) {
        console.log(
          "✅ First save complete, silently updating URL to:",
          savedWorkflow.id
        );
        hasNavigatedFromNewRef.current = true;
        loadedWorkflowIdRef.current = savedWorkflow.id;

        // Use History API for completely silent URL update (Figma/Linear approach)
        // This updates the browser URL bar without ANY navigation events
        const newUrl = `/flows/${savedWorkflow.id}`;
        window.history.replaceState(
          { ...window.history.state, as: newUrl, url: newUrl },
          "",
          newUrl
        );

        console.log("🎯 URL silently updated - no page reload");
      }
    },
  });

  // Workflow loading logic - Figma-like approach
  useEffect(() => {
    async function loadWorkflowData() {
      if (userLoading || !user) return;

      // FIGMA-STYLE: Skip reload if we're already displaying this workflow
      // This prevents the jarring reload when URL changes from /new to /id
      if (loadedWorkflowIdRef.current === workflowId) {
        console.log("🎯 Already loaded workflow, skipping reload:", workflowId);
        return;
      }

      // CRITICAL: Clear workflow store at the start to prevent cross-contamination
      // This ensures clean state when switching between workflows
      console.log("🧹 Clearing workflow store for fresh load");
      clearWorkflow();

      // Handle new workflow creation
      if (workflowId === "new") {
        // CRITICAL: Only create workflow once using ref guard
        if (!workflowCreatedRef.current) {
          // RECOVERY: Check if there's a recent unsaved workflow in the database
          // This handles the case where user added nodes, switched tabs, save completed,
          // but then they navigated back to /flows/new
          try {
            const supabase = createClient();
            const { data: recentWorkflows } = await supabase
              .from("workflows")
              .select("*")
              .eq("user_id", user.id)
              .eq("name", "Untitled Workflow")
              .order("created_at", { ascending: false })
              .limit(1);

            // If there's a very recent workflow (< 30 seconds old), load it instead
            if (recentWorkflows && recentWorkflows.length > 0) {
              const recentWorkflow = recentWorkflows[0];
              const createdAt = new Date(recentWorkflow.created_at);
              const now = new Date();
              const ageInSeconds = (now.getTime() - createdAt.getTime()) / 1000;

              if (ageInSeconds < 30) {
                console.log(
                  "🔄 Found recent unsaved workflow, redirecting to:",
                  recentWorkflow.id
                );
                // Redirect to the actual workflow instead of staying on /new
                window.history.replaceState(
                  {
                    ...window.history.state,
                    as: `/flows/${recentWorkflow.id}`,
                    url: `/flows/${recentWorkflow.id}`,
                  },
                  "",
                  `/flows/${recentWorkflow.id}`
                );
                // Force a re-render to load the correct workflow
                router.push(`/flows/${recentWorkflow.id}`);
                setLoadingWorkflow(false);
                return;
              }
            }
          } catch (error) {
            console.error("Failed to check for recent workflows:", error);
            // Continue with normal flow if check fails
          }

          console.log("📝 Creating new workflow (stays on /new until saved)");
          workflowCreatedRef.current = true;
          loadedWorkflowIdRef.current = "new";
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
          loadedWorkflowIdRef.current = workflowId;
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

    // Cleanup function: Reset guards when navigating to a different workflow
    return () => {
      // Only reset if we're truly switching to a different workflow
      if (workflowId !== loadedWorkflowIdRef.current) {
        workflowCreatedRef.current = false;
        hasNavigatedFromNewRef.current = false;
        loadedWorkflowIdRef.current = null;
      }
    };
  }, [
    workflowId,
    user,
    userLoading,
    createWorkflow,
    loadWorkflow,
    clearWorkflow,
  ]);

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
    // Control mode shortcuts - Disabled to lock canvas to hand mode
    // v: () => setControlMode("pointer"),
    // h: () => setControlMode("hand"),
  });

  // Loading states
  if (userLoading || loadingWorkflow) {
    return <LoadingScreen />;
    return <LoadingScreen />;
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
            className="px-6 py-2.5 bg-[#095D40] text-white rounded-lg font-medium text-[14px] hover:bg-[#074030] transition-all"
            className="px-6 py-2.5 bg-[#095D40] text-white rounded-lg font-medium text-[14px] hover:bg-[#074030] transition-all"
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

        {/* Sticky Notes Overlay - connected to the workflow */}
        <StickyNoteOverlay workflowId={workflowId} />

        {/* Notes Panel Toggle Button - Fixed position closer to top right */}
        {!isNotesPanelOpen && user && (
          <button
            onClick={() => setIsNotesPanelOpen(true)}
            className="fixed top-20 right-6 z-30 p-3 bg-white rounded-xl shadow-lg hover:shadow-xl border border-gray-200 hover:border-gray-300 transition-all group"
            title="Open notes"
          >
            <FileText className="h-5 w-5 text-gray-700 group-hover:text-blue-600 transition-colors" />
          </button>
        )}

        {/* Notes Panel */}
        {user && (
          <NotesPanel
            workflowId={workflowId}
            userId={user.id}
            isOpen={isNotesPanelOpen}
            onClose={() => setIsNotesPanelOpen(false)}
          />
        )}
        {/* Sticky Notes Overlay - disabled by default, can be enabled via props */}
        <StickyNoteOverlay enabled={false} notes={[]} />

        {/* Notes Panel Toggle Button - Fixed position closer to top right */}
        {!isNotesPanelOpen && user && (
          <button
            onClick={() => setIsNotesPanelOpen(true)}
            className="fixed top-20 right-6 z-30 p-3 bg-white rounded-xl shadow-lg hover:shadow-xl border border-gray-200 hover:border-gray-300 transition-all group"
            title="Open notes"
          >
            <FileText className="h-5 w-5 text-gray-700 group-hover:text-blue-600 transition-colors" />
          </button>
        )}

        {/* Notes Panel */}
        {user && (
          <NotesPanel
            workflowId={workflowId}
            userId={user.id}
            isOpen={isNotesPanelOpen}
            onClose={() => setIsNotesPanelOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
