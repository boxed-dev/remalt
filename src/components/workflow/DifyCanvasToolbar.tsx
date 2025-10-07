'use client';

import { Hand, MousePointer2, Undo2, Redo2, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { cn } from '@/lib/utils';

export function DifyCanvasToolbar() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const undo = useWorkflowStore((state) => state.undo);
  const redo = useWorkflowStore((state) => state.redo);
  const canUndo = useWorkflowStore((state) => state.canUndo());
  const canRedo = useWorkflowStore((state) => state.canRedo());
  const controlMode = useWorkflowStore((state) => state.controlMode);
  const setControlMode = useWorkflowStore((state) => state.setControlMode);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 flex items-center divide-x divide-gray-200">
        {/* Hand/Pointer tools */}
        <div className="flex items-center px-1 py-1">
          <button
            onClick={() => setControlMode('pointer')}
            className={cn(
              "p-2 rounded transition-colors",
              controlMode === 'pointer'
                ? "bg-[#095D40] text-white"
                : "text-gray-700 hover:bg-gray-100"
            )}
            title="Pointer tool"
          >
            <MousePointer2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setControlMode('hand')}
            className={cn(
              "p-2 rounded transition-colors",
              controlMode === 'hand'
                ? "bg-[#095D40] text-white"
                : "text-gray-700 hover:bg-gray-100"
            )}
            title="Hand tool"
          >
            <Hand className="h-4 w-4" />
          </button>
        </div>

        {/* Undo/Redo */}
        <div className="flex items-center px-1 py-1">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Undo"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Redo"
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center px-1 py-1">
          <button
            onClick={() => zoomOut({ duration: 200 })}
            className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-700"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={() => zoomIn({ duration: 200 })}
            className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-700"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => fitView({ duration: 200, padding: 0.2 })}
            className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-700"
            title="Fit view"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
