'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    const isTextControl = (target: EventTarget | null) => {
      if (!target || !(target instanceof HTMLElement)) {
        return false;
      }
      if (target.isContentEditable) {
        return true;
      }
      const tagName = target.tagName.toLowerCase();
      return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTextControl(event.target)) {
        return;
      }

      const openShortcutModal = () => {
        event.preventDefault();
        setShowShortcuts(true);
      };

      if (event.key === '?' || (event.key === '/' && (event.metaKey || event.ctrlKey))) {
        openShortcutModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 bg-white rounded-lg border border-[#D4AF7F]/30 shadow-lg p-1">
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

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded hover:bg-[#D4AF7F]/10 text-[#6B7280] hover:text-[#095D40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#095D40]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white transition-colors"
          onClick={onAutoLayout}
          title="Auto-arrange • Perfect layout"
        >
          <Network className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded hover:bg-[#D4AF7F]/10 text-[#6B7280] hover:text-[#095D40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#095D40]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white transition-colors"
          onClick={() => setShowShortcuts(true)}
          title="Shortcuts • Work faster (⇧/ or ⌘/ )"
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
