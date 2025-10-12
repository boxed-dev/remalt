'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';
import { X } from 'lucide-react';
import { useWorkflowStore } from '@/lib/stores/workflow-store';

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
}: EdgeProps) {
  const deleteEdge = useWorkflowStore((state) => state.deleteEdge);
  const [isHovered, setIsHovered] = useState(false);

  // Memoize path calculation for performance and consistency
  const [edgePath, labelX, labelY] = useMemo(() => {
    return getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });
  }, [sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition]);

  const handleDelete = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      deleteEdge(id);
    },
    [deleteEdge, id]
  );

  // Generate unique ID for animation
  const animationId = `edge-flow-${id}`;

  return (
    <>
      {/* Define the animated gradient in SVG defs */}
      <defs>
        <linearGradient id={animationId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
          <stop offset="25%" stopColor="#059669" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#10B981" stopOpacity="0.3" />
          <stop offset="75%" stopColor="#059669" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0.3" />
          <animate
            attributeName="x1"
            values="0%;100%;200%"
            dur="2.0s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="x2"
            values="100%;200%;300%"
            dur="2.0s"
            repeatCount="indefinite"
          />
        </linearGradient>
      </defs>

      {/* Light green dotted background layer */}
      <BaseEdge
        path={edgePath}
        style={{
          ...style,
          strokeWidth: selected ? 3.5 : 2.5,
          stroke: '#86EFAC',
          strokeDasharray: '2 6',
          strokeLinecap: 'round',
          opacity: 0.7,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />

      {/* Animated dark green dotted layer */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected ? 3.5 : 2.5,
          stroke: selected ? '#047857' : `url(#${animationId})`,
          strokeDasharray: '2 6',
          strokeLinecap: 'round',
          strokeDashoffset: 0,
          animation: 'dash-flow 1.5s linear infinite',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />

      {/* CSS Animation for dash movement */}
      <style>
        {`
          @keyframes dash-flow {
            from {
              stroke-dashoffset: 0;
            }
            to {
              stroke-dashoffset: -8;
            }
          }
        `}
      </style>

      {(selected || isHovered) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              zIndex: 1000,
            }}
            className="nodrag nopan"
          >
            <button
              onClick={handleDelete}
              className="flex items-center justify-center w-7 h-7 rounded-full bg-white border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg hover:shadow-xl"
              title="Delete edge"
            >
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
