'use client';

import { useEffect, useState } from 'react';
import { useReactFlow, useViewport } from '@xyflow/react';
import type { Node } from '@xyflow/react';

interface Guide {
  type: 'vertical' | 'horizontal';
  position: number; // x for vertical, y for horizontal
  snapPosition: number; // The position to snap the dragged node to
}

interface AlignmentGuidesProps {
  draggingNodeId: string | null;
}

const SNAP_THRESHOLD = 10; // pixels
const GUIDE_COLOR = '#095D40';
const GUIDE_OPACITY = 0.6;

export function AlignmentGuides({ draggingNodeId }: AlignmentGuidesProps) {
  const { getNodes } = useReactFlow();
  const { zoom, x: viewportX, y: viewportY } = useViewport();
  const [guides, setGuides] = useState<Guide[]>([]);

  useEffect(() => {
    if (!draggingNodeId) {
      setGuides([]);
      return;
    }

    const nodes = getNodes();
    const draggingNode = nodes.find((n) => n.id === draggingNodeId);
    const otherNodes = nodes.filter((n) => n.id !== draggingNodeId);

    if (!draggingNode || otherNodes.length === 0) {
      setGuides([]);
      return;
    }

    const newGuides: Guide[] = [];
    const draggingWidth = draggingNode.width || 300;
    const draggingHeight = draggingNode.height || 200;
    const draggingLeft = draggingNode.position.x;
    const draggingCenter = draggingNode.position.x + draggingWidth / 2;
    const draggingRight = draggingNode.position.x + draggingWidth;
    const draggingTop = draggingNode.position.y;
    const draggingMiddle = draggingNode.position.y + draggingHeight / 2;
    const draggingBottom = draggingNode.position.y + draggingHeight;

    // Check alignment with each other node
    otherNodes.forEach((node) => {
      const nodeWidth = node.width || 300;
      const nodeHeight = node.height || 200;
      const nodeLeft = node.position.x;
      const nodeCenter = node.position.x + nodeWidth / 2;
      const nodeRight = node.position.x + nodeWidth;
      const nodeTop = node.position.y;
      const nodeMiddle = node.position.y + nodeHeight / 2;
      const nodeBottom = node.position.y + nodeHeight;

      // Vertical alignment guides (left, center, right)
      if (Math.abs(draggingLeft - nodeLeft) < SNAP_THRESHOLD) {
        newGuides.push({
          type: 'vertical',
          position: nodeLeft,
          snapPosition: nodeLeft,
        });
      }
      if (Math.abs(draggingCenter - nodeCenter) < SNAP_THRESHOLD) {
        newGuides.push({
          type: 'vertical',
          position: nodeCenter,
          snapPosition: nodeCenter - draggingWidth / 2,
        });
      }
      if (Math.abs(draggingRight - nodeRight) < SNAP_THRESHOLD) {
        newGuides.push({
          type: 'vertical',
          position: nodeRight,
          snapPosition: nodeRight - draggingWidth,
        });
      }

      // Horizontal alignment guides (top, middle, bottom)
      if (Math.abs(draggingTop - nodeTop) < SNAP_THRESHOLD) {
        newGuides.push({
          type: 'horizontal',
          position: nodeTop,
          snapPosition: nodeTop,
        });
      }
      if (Math.abs(draggingMiddle - nodeMiddle) < SNAP_THRESHOLD) {
        newGuides.push({
          type: 'horizontal',
          position: nodeMiddle,
          snapPosition: nodeMiddle - draggingHeight / 2,
        });
      }
      if (Math.abs(draggingBottom - nodeBottom) < SNAP_THRESHOLD) {
        newGuides.push({
          type: 'horizontal',
          position: nodeBottom,
          snapPosition: nodeBottom - draggingHeight,
        });
      }
    });

    // Remove duplicate guides
    const uniqueGuides = newGuides.filter((guide, index, self) => {
      return (
        index ===
        self.findIndex((g) => g.type === guide.type && g.position === guide.position)
      );
    });

    setGuides(uniqueGuides);
  }, [draggingNodeId, getNodes]);

  if (!draggingNodeId || guides.length === 0) {
    return null;
  }

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[60]"
      style={{
        width: '100%',
        height: '100%',
      }}
    >
      {guides.map((guide, index) => {
        if (guide.type === 'vertical') {
          // Vertical guide (left/center/right alignment)
          const x = guide.position * zoom + viewportX;
          return (
            <line
              key={`v-${index}`}
              x1={x}
              y1={0}
              x2={x}
              y2="100%"
              stroke={GUIDE_COLOR}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              opacity={GUIDE_OPACITY}
            />
          );
        } else {
          // Horizontal guide (top/middle/bottom alignment)
          const y = guide.position * zoom + viewportY;
          return (
            <line
              key={`h-${index}`}
              x1={0}
              y1={y}
              x2="100%"
              y2={y}
              stroke={GUIDE_COLOR}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              opacity={GUIDE_OPACITY}
            />
          );
        }
      })}
    </svg>
  );
}
