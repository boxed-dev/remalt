'use client';

import { useEffect, useState, useRef } from 'react';
import { useReactFlow, useViewport } from '@xyflow/react';
import {
  Copy,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyCenter,
  MoveHorizontal,
  MoveVertical,
  FolderPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { stopCanvasPointerEvent, stopCanvasWheelEvent } from '@/lib/workflow/interaction-guards';

interface SelectionFloatingToolbarProps {
  selectedNodeIds: string[];
  onCopy: () => void;
  onDelete: () => void;
  onAlign: (direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  onDistribute: (direction: 'horizontal' | 'vertical') => void;
  onGroup: () => void;
}

export function SelectionFloatingToolbar({
  selectedNodeIds,
  onCopy,
  onDelete,
  onAlign,
  onDistribute,
  onGroup,
}: SelectionFloatingToolbarProps) {
  const { getNodes } = useReactFlow();
  const { zoom } = useViewport();
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedNodeIds.length < 2) {
      setPosition(null);
      return;
    }

    const nodes = getNodes().filter((n) => selectedNodeIds.includes(n.id));
    if (nodes.length === 0) {
      setPosition(null);
      return;
    }

    // Calculate bounding box of selected nodes
    const bounds = nodes.reduce(
      (acc, node) => {
        const x = node.position.x;
        const y = node.position.y;
        const width = (node.width || 300);
        const height = (node.height || 200);

        return {
          minX: Math.min(acc.minX, x),
          minY: Math.min(acc.minY, y),
          maxX: Math.max(acc.maxX, x + width),
          maxY: Math.max(acc.maxY, y + height),
        };
      },
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
    );

    // Get viewport offset
    const viewport = document.querySelector('.react-flow__viewport');
    if (!viewport) return;

    const viewportRect = viewport.getBoundingClientRect();

    // Calculate center X of selection
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const topY = bounds.minY;

    // Transform to screen coordinates
    const screenX = centerX * zoom + viewportRect.left;
    const screenY = topY * zoom + viewportRect.top;

    // Position toolbar above selection (with 20px gap)
    const toolbarHeight = 48;
    const gap = 20;

    setPosition({
      x: screenX,
      y: screenY - toolbarHeight - gap,
    });
  }, [selectedNodeIds, getNodes, zoom]);

  // Update position on scroll/zoom
  useEffect(() => {
    const updatePosition = () => {
      // Trigger re-calculation by forcing state update
      setPosition((prev) => (prev ? { ...prev } : null));
    };

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('wheel', updatePosition, { passive: true });

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('wheel', updatePosition);
    };
  }, []);

  if (!position || selectedNodeIds.length < 2) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div
        ref={toolbarRef}
        data-flowy-interactive="true"
        onPointerDownCapture={stopCanvasPointerEvent}
        onMouseDownCapture={stopCanvasPointerEvent}
        onWheelCapture={stopCanvasWheelEvent}
        className="fixed z-[90] flex items-center gap-1 px-2 py-1.5 bg-white rounded-lg border border-[#D4AF7F]/30 shadow-lg"
        style={{
          left: position.x,
          top: position.y,
          transform: 'translateX(-50%)',
        }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-[#D4AF7F]/10 hover:text-[#095D40]"
              onClick={onCopy}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Copy Selection</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-[#D4AF7F]/10 hover:text-[#095D40]"
              onClick={onGroup}
            >
              <FolderPlus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Group Nodes</TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-[#D4AF7F]/20 mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-[#D4AF7F]/10 hover:text-[#095D40]"
              onClick={() => onAlign('left')}
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Align Left</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-[#D4AF7F]/10 hover:text-[#095D40]"
              onClick={() => onAlign('center')}
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Align Center</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-[#D4AF7F]/10 hover:text-[#095D40]"
              onClick={() => onAlign('right')}
            >
              <AlignRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Align Right</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-[#D4AF7F]/10 hover:text-[#095D40]"
              onClick={() => onAlign('middle')}
            >
              <AlignVerticalJustifyCenter className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Align Middle</TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-[#D4AF7F]/20 mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-[#D4AF7F]/10 hover:text-[#095D40]"
              onClick={() => onDistribute('horizontal')}
            >
              <MoveHorizontal className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Distribute Horizontally</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-[#D4AF7F]/10 hover:text-[#095D40]"
              onClick={() => onDistribute('vertical')}
            >
              <MoveVertical className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Distribute Vertically</TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-[#D4AF7F]/20 mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Delete Selection</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
