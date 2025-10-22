'use client';

import { Hand, MousePointer, Undo2, Redo2 } from 'lucide-react';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { cn } from '@/lib/utils';

export function DifyFloatingToolbar() {
  const controlMode = useWorkflowStore((state) => state.controlMode);
  const setControlMode = useWorkflowStore((state) => state.setControlMode);
  const undo = useWorkflowStore((state) => state.undo);
  const redo = useWorkflowStore((state) => state.redo);
  const canUndo = useWorkflowStore((state) => state.canUndo());
  const canRedo = useWorkflowStore((state) => state.canRedo());

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="flex items-center gap-0.5 bg-white rounded-xl border border-gray-200 shadow-lg p-1.5 pointer-events-auto">
        {/* Select tool */}
        <button
          onClick={() => setControlMode('pointer')}
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-lg transition-all",
            controlMode === 'pointer'
              ? "bg-gray-900 text-white hover:bg-gray-800"
              : "text-gray-700 hover:bg-gray-100"
          )}
          title="Select (V)"
        >
          <MousePointer className="h-4 w-4" />
        </button>

        {/* Hand tool */}
        <button
          onClick={() => setControlMode('hand')}
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-lg transition-all",
            controlMode === 'hand'
              ? "bg-gray-900 text-white hover:bg-gray-800"
              : "text-gray-700 hover:bg-gray-100"
          )}
          title="Hand tool (H)"
        >
          <Hand className="h-4 w-4" />
        </button>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* Undo */}
        <button
          onClick={undo}
          disabled={!canUndo}
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-lg transition-colors",
            canUndo
              ? "text-gray-700 hover:bg-gray-100"
              : "text-gray-300 cursor-not-allowed"
          )}
          title="Undo (⌘Z)"
        >
          <Undo2 className="h-4 w-4" />
        </button>

        {/* Redo */}
        <button
          onClick={redo}
          disabled={!canRedo}
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-lg transition-colors",
            canRedo
              ? "text-gray-700 hover:bg-gray-100"
              : "text-gray-300 cursor-not-allowed"
          )}
          title="Redo (⌘⇧Z)"
        >
          <Redo2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
