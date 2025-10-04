'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Network,
  Command
} from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';

interface WorkflowToolbarProps {
  onAutoLayout?: () => void;
}

export function WorkflowToolbar({ onAutoLayout }: WorkflowToolbarProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const undo = useWorkflowStore((state) => state.undo);
  const redo = useWorkflowStore((state) => state.redo);
  const canUndo = useWorkflowStore((state) => state.canUndo());
  const canRedo = useWorkflowStore((state) => state.canRedo());

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
    <>
      {/* Bottom-right floating control panel */}
      <div className="fixed bottom-4 right-4 z-20 flex items-center gap-2 bg-white rounded-lg border border-[#E8ECEF] shadow-lg p-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded hover:bg-[#F5F5F7] text-[#6B7280] hover:text-[#1A1D21]"
          onClick={undo}
          title="Undo (Cmd+Z)"
          disabled={!canUndo}
        >
          <Undo2 className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded hover:bg-[#F5F5F7] text-[#6B7280] hover:text-[#1A1D21]"
          onClick={redo}
          title="Redo (Cmd+Shift+Z)"
          disabled={!canRedo}
        >
          <Redo2 className="h-4 w-4" />
        </Button>

        <div className="w-px h-5 bg-[#E8ECEF]" />

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded hover:bg-[#F5F5F7] text-[#6B7280] hover:text-[#1A1D21]"
          onClick={handleZoomOut}
          title="Zoom Out (-)"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded hover:bg-[#F5F5F7] text-[#6B7280] hover:text-[#1A1D21]"
          onClick={handleZoomIn}
          title="Zoom In (=)"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded hover:bg-[#F5F5F7] text-[#6B7280] hover:text-[#1A1D21]"
          onClick={handleFitView}
          title="Fit View (1)"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>

        <div className="w-px h-5 bg-[#E8ECEF]" />

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded hover:bg-[#F5F5F7] text-[#6B7280] hover:text-[#1A1D21]"
          onClick={onAutoLayout}
          title="Auto Layout"
        >
          <Network className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded hover:bg-[#F5F5F7] text-[#6B7280] hover:text-[#1A1D21]"
          onClick={() => setShowShortcuts(true)}
          title="Keyboard Shortcuts (Cmd+K)"
        >
          <Command className="h-4 w-4" />
        </Button>
      </div>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        open={showShortcuts}
        onOpenChange={setShowShortcuts}
      />
    </>
  );
}
