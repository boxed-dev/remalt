"use client";

import { useState } from "react";
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Keyboard,
  StickyNote,
  Play,
  XCircle,
} from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import { useWorkflowStore } from "@/lib/stores/workflow-store";
import { useStickyNotesStore } from "@/lib/stores/sticky-notes-store";
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal";
import { cn } from "@/lib/utils";

export function DifyCanvasToolbar() {
  const [showShortcuts, setShowShortcuts] = useState(false);
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
  const workflow = useWorkflowStore((state) => state.workflow);

  const handleExecuteWorkflow = async () => {
    if (!workflow || isExecuting) return;
    await executeWorkflow();
  };

  const handleCancelExecution = () => {
    cancelExecution();
  };

  return (
    <>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 flex items-center divide-x divide-gray-200">

          {/* Undo/Redo */}
          <div className="flex items-center px-1 py-1">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Undo (⌘Z)"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Redo (⌘⇧Z)"
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>

          {/* Sticky Notes */}
          <div className="flex items-center px-1 py-1">
            <button
              onClick={toggleStickyMode}
              className={cn(
                "p-2 rounded transition-colors",
                isStickyActive
                  ? "bg-[#095D40] text-white"
                  : "text-gray-700 hover:bg-gray-100"
              )}
              title="Sticky notes • Click canvas to add"
            >
              <StickyNote className="h-4 w-4" />
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center px-1 py-1">
            <button
              onClick={() => zoomOut({ duration: 200 })}
              className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-700"
              title="Zoom out (-)"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              onClick={() => zoomIn({ duration: 200 })}
              className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-700"
              title="Zoom in (=)"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={() => fitView({ duration: 200, padding: 0.2 })}
              className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-700"
              title="Fit view (1)"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>

          {/* Keyboard shortcuts */}
          <div className="flex items-center px-1 py-1">
            <button
              onClick={() => setShowShortcuts(true)}
              className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-700"
              title="Keyboard shortcuts"
            >
              <Keyboard className="h-4 w-4" />
            </button>
          </div>

          {/* Run Workflow Button - BIG AND OBVIOUS */}
          <div className="flex items-center px-1 py-1">
            {isExecuting ? (
              <button
                onClick={handleCancelExecution}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-[12px] transition-all border border-red-200"
                title="Cancel execution"
              >
                <XCircle className="h-4 w-4" />
                <span>Cancel</span>
              </button>
            ) : (
              <button
                onClick={handleExecuteWorkflow}
                disabled={!workflow}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#095D40] hover:bg-[#064030] text-white font-semibold text-[12px] transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                title="Run entire workflow"
              >
                <Play className="h-4 w-4 fill-white" />
                <span>Run</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        open={showShortcuts}
        onOpenChange={setShowShortcuts}
      />
    </>
  );
}
