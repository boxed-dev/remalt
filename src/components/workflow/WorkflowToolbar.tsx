'use client';

import { Button } from '@/components/ui/button';
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Network,
  StickyNote,
  Play,
  XCircle
} from 'lucide-react';
import { useState, useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { useStickyNotesStore } from '@/lib/stores/sticky-notes-store';
import { ZoomIndicator } from './ZoomIndicator';

interface WorkflowToolbarProps {
  onAutoLayout?: () => void;
}

export function WorkflowToolbar({ onAutoLayout }: WorkflowToolbarProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const undo = useWorkflowStore((state) => state.undo);
  const redo = useWorkflowStore((state) => state.redo);
  const canUndo = useWorkflowStore((state) => state.canUndo());
  const canRedo = useWorkflowStore((state) => state.canRedo());
  const isStickyActive = useStickyNotesStore((state) => state.isActive);
  const toggleStickyMode = useStickyNotesStore((state) => state.toggleStickyMode);

  // Execution state
  const executeWorkflow = useWorkflowStore((state) => state.executeWorkflow);
  const cancelExecution = useWorkflowStore((state) => state.cancelExecution);
  const isExecuting = useWorkflowStore((state) => state.isExecuting);
  const executionError = useWorkflowStore((state) => state.executionError);
  const workflow = useWorkflowStore((state) => state.workflow);

  const [showExecutionError, setShowExecutionError] = useState(false);

  const handleExecuteWorkflow = useCallback(async () => {
    if (!workflow || isExecuting) return;

    setShowExecutionError(false);
    await executeWorkflow();

    // Show error if execution failed
    const error = useWorkflowStore.getState().executionError;
    if (error) {
      setShowExecutionError(true);
      setTimeout(() => setShowExecutionError(false), 5000);
    }
  }, [workflow, isExecuting, executeWorkflow]);

  const handleCancelExecution = useCallback(() => {
    cancelExecution();
    setShowExecutionError(false);
  }, [cancelExecution]);

  const handleZoomIn = () => {
    zoomIn({ duration: 200 });
  };

  const handleZoomOut = () => {
    zoomOut({ duration: 200 });
  };

  const handleFitView = () => {
    fitView({ duration: 200, padding: 0.2 });
  };

  return (
    <div className="fixed bottom-6 right-6 z-[70] flex items-center gap-2 bg-white rounded-lg border border-[#D4AF7F]/30 shadow-lg p-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded hover:bg-[#D4AF7F]/10 text-[#6B7280] hover:text-[#095D40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#095D40]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white transition-colors"
          onClick={undo}
          title="Undo • Go back one step"
          disabled={!canUndo}
        >
          <Undo2 className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded hover:bg-[#D4AF7F]/10 text-[#6B7280] hover:text-[#095D40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#095D40]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white transition-colors"
          onClick={redo}
          title="Redo • Move forward one step"
          disabled={!canRedo}
        >
          <Redo2 className="h-4 w-4" />
        </Button>

        <div className="w-px h-5 bg-[#D4AF7F]/20" />

        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#095D40]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
            isStickyActive
              ? 'bg-[#095D40]/10 text-[#095D40] hover:bg-[#095D40]/20'
              : 'hover:bg-[#D4AF7F]/10 text-[#6B7280] hover:text-[#095D40]'
          }`}
          onClick={toggleStickyMode}
          title="Sticky notes • Click canvas to add"
        >
          <StickyNote className="h-4 w-4" />
        </Button>

        <div className="w-px h-5 bg-[#D4AF7F]/20" />

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded hover:bg-[#D4AF7F]/10 text-[#6B7280] hover:text-[#095D40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#095D40]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white transition-colors"
          onClick={handleZoomOut}
          title="Zoom out • See more canvas"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded hover:bg-[#D4AF7F]/10 text-[#6B7280] hover:text-[#095D40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#095D40]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white transition-colors"
          onClick={handleZoomIn}
          title="Zoom in • Focus closer"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>

        <ZoomIndicator />

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded hover:bg-[#D4AF7F]/10 text-[#6B7280] hover:text-[#095D40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#095D40]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white transition-colors"
          onClick={handleFitView}
          title="Fit view • See everything"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>

        <div className="w-px h-5 bg-[#D4AF7F]/20" />

        {/* Run Workflow Button - PROMINENT */}
        {isExecuting ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-4 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-[12px] transition-all shadow-sm"
            onClick={handleCancelExecution}
            title="Cancel execution"
          >
            <XCircle className="h-4 w-4 mr-1.5" />
            Cancel
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-4 rounded-lg bg-[#095D40] hover:bg-[#064030] text-white font-semibold text-[12px] transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleExecuteWorkflow}
            disabled={!workflow || isExecuting}
            title="Run entire workflow"
          >
            <Play className="h-4 w-4 mr-1.5 fill-white" />
            Run Workflow
          </Button>
        )}

        {/* Error Toast */}
        {showExecutionError && executionError && (
          <div className="absolute bottom-full mb-2 right-0 bg-red-50 border border-red-200 rounded-lg px-3 py-2 shadow-lg min-w-[200px] max-w-[300px]">
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-[11px] font-medium text-red-700">Execution Failed</p>
                <p className="text-[10px] text-red-600 mt-0.5">{executionError}</p>
              </div>
            </div>
          </div>
        )}

        <div className="w-px h-5 bg-[#D4AF7F]/20" />

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded hover:bg-[#D4AF7F]/10 text-[#6B7280] hover:text-[#095D40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#095D40]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white transition-colors"
          onClick={onAutoLayout}
          title="Auto-arrange • Perfect layout"
        >
          <Network className="h-4 w-4" />
        </Button>
      </div>
  );
}
