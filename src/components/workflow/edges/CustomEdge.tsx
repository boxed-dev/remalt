'use client';

import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
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
  const edgeRef = useRef<SVGGElement>(null);

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

  // Show delete button on hover OR when selected
  const showDeleteButton = isHovered || selected;

  // Debug logging
  useEffect(() => {
    if (isHovered) {
      console.log(`Edge ${id} is hovered`);
    }
  }, [isHovered, id]);

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

      {/* Wrap all edge paths in a group for better event handling */}
      <g
        ref={edgeRef}
        onMouseEnter={() => {
          console.log('MOUSE ENTER DETECTED on edge', id);
          setIsHovered(true);
        }}
        onMouseLeave={() => {
          console.log('MOUSE LEAVE DETECTED on edge', id);
          setIsHovered(false);
        }}
        style={{ cursor: 'pointer' }}
      >
        {/* Invisible wider hit area for better hover detection - FIRST for event capture */}
        <path
          d={edgePath}
          fill="none"
          stroke="transparent"
          strokeWidth={20}
          style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
        />

        {/* Light green dotted background layer */}
        <path
          d={edgePath}
          fill="none"
          stroke="#86EFAC"
          strokeWidth={selected ? 3.5 : 2.5}
          strokeDasharray="2 6"
          strokeLinecap="round"
          opacity={0.7}
          style={{ pointerEvents: 'none' }}
        />

        {/* Animated dark green dotted layer */}
        <path
          d={edgePath}
          fill="none"
          stroke={selected ? '#047857' : `url(#${animationId})`}
          strokeWidth={selected ? 3.5 : 2.5}
          strokeDasharray="2 6"
          strokeLinecap="round"
          strokeDashoffset={0}
          markerEnd={markerEnd}
          style={{
            pointerEvents: 'none',
            animation: 'dash-flow 1.5s linear infinite',
          }}
        />
      </g>

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

      {showDeleteButton && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              zIndex: 1000,
            }}
            className="nodrag nopan"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <button
              onClick={handleDelete}
              className="flex items-center justify-center w-7 h-7 rounded-full bg-white border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-150 shadow-lg hover:shadow-xl hover:scale-110"
              title="Delete connection"
            >
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
