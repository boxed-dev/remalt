'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { WorkflowCanvas } from '@/components/workflow/WorkflowCanvas';
import { WorkflowSidebar } from '@/components/workflow/WorkflowSidebar';
import { WorkflowToolbar } from '@/components/workflow/WorkflowToolbar';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useWorkflowPersistence } from '@/hooks/use-workflow-persistence';
import { createClient } from '@/lib/supabase/client';
import { getWorkflow } from '@/lib/supabase/workflows';
import { Loader2 } from 'lucide-react';

export default function WorkflowEditorPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;
  const { user, loading: userLoading } = useCurrentUser();

  const [loadingWorkflow, setLoadingWorkflow] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const workflow = useWorkflowStore((state) => state.workflow);
  const createWorkflow = useWorkflowStore((state) => state.createWorkflow);
  const loadWorkflow = useWorkflowStore((state) => state.loadWorkflow);
  const selectedNodes = useWorkflowStore((state) => state.selectedNodes);
  const deleteNodes = useWorkflowStore((state) => state.deleteNodes);
  const copyNodes = useWorkflowStore((state) => state.copyNodes);
  const duplicateNode = useWorkflowStore((state) => state.duplicateNode);

  // Debug user state
  useEffect(() => {
    console.log('🔐 User state:', {
      user: user?.id,
      email: user?.email,
      loading: userLoading
    });
  }, [user, userLoading]);

  // Auto-save integration
  const { saveWorkflow } = useWorkflowPersistence({
    autoSave: true,
    autoSaveDelay: 2000,
    userId: user?.id || null,
  });

  // Load workflow from Supabase
  useEffect(() => {
    async function loadWorkflowData() {
      if (userLoading || !user) return;

      // Check if this is a "new" workflow request
      if (workflowId === 'new') {
        createWorkflow('Untitled Workflow', 'A new workflow');
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
        } else {
          setLoadError('Workflow not found');
        }
      } catch (error: any) {
        console.error('Failed to load workflow:', error);
        setLoadError(error.message || 'Failed to load workflow');
      } finally {
        setLoadingWorkflow(false);
      }
    }

    loadWorkflowData();
  }, [workflowId, user, userLoading, createWorkflow, loadWorkflow]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'mod+s': () => {
      // Manual save
      saveWorkflow();
    },
    'mod+d': () => {
      // Duplicate selected node
      if (selectedNodes.length === 1) {
        duplicateNode(selectedNodes[0]);
      }
    },
    'mod+c': () => {
      // Copy selected nodes
      if (selectedNodes.length > 0) {
        copyNodes(selectedNodes);
      }
    },
    'escape': () => {
      // Clear selection
      if (selectedNodes.length > 0) {
        useWorkflowStore.getState().clearSelection();
      }
    },
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
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-[20px] font-semibold text-[#1A1D21] mb-2">Failed to load workflow</h2>
          <p className="text-[14px] text-[#6B7280] mb-6">{loadError}</p>
          <button
            onClick={() => router.push('/flows')}
            className="px-6 py-2.5 bg-[#007AFF] text-white rounded-lg font-medium text-[14px] hover:bg-[#0051D5] transition-all"
          >
            Back to Flows
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#FAFBFC]">
      <WorkflowToolbar />

      {/* Canvas Area */}
      <div className="flex-1 flex overflow-hidden">
        <WorkflowSidebar />
        <div className="flex-1">
          <WorkflowCanvas />
        </div>
      </div>
    </div>
  );
}
