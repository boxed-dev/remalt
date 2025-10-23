'use client';

import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useViewport,
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
  const { zoom } = useViewport();

  // Calculate dynamic stroke width based on zoom level
  // This ensures edges remain visible at all zoom levels
  const calculateStrokeWidth = useCallback((baseWidth: number) => {
    // Inverse relationship with zoom: as zoom decreases (zoom out), stroke increases
    // Using a smooth logarithmic scale for better visual continuity
    const minZoom = 0.1;
    const maxZoom = 2;

    // Clamp zoom to reasonable bounds
    const clampedZoom = Math.max(minZoom, Math.min(maxZoom, zoom));

    // Calculate scale factor - increases as zoom decreases
    // At zoom 1.0 (100%), scaleFactor = 1
    // At zoom 0.5 (50%), scaleFactor ≈ 1.4
    // At zoom 0.25 (25%), scaleFactor ≈ 2
    // At zoom 0.1 (10%), scaleFactor ≈ 3
    const scaleFactor = Math.pow(1 / clampedZoom, 0.5);

    // Apply scale with reasonable bounds
    const minWidth = baseWidth;
    const maxWidth = baseWidth * 4; // Maximum 4x the base width

    const scaledWidth = baseWidth * scaleFactor;
    return Math.max(minWidth, Math.min(maxWidth, scaledWidth));
  }, [zoom]);

  // Calculate dynamic dash pattern based on zoom level
  const calculateDashArray = useCallback(() => {
    const baseDash = 2;
    const baseGap = 6;
    const scaleFactor = Math.pow(1 / Math.max(0.1, Math.min(2, zoom)), 0.5);

    const scaledDash = baseDash * scaleFactor;
    const scaledGap = baseGap * scaleFactor;

    return `${scaledDash} ${scaledGap}`;
  }, [zoom]);

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
          <stop offset="0%" stopColor="#D4AF7F" stopOpacity="0.3" />
          <stop offset="25%" stopColor="#095D40" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#D4AF7F" stopOpacity="0.3" />
          <stop offset="75%" stopColor="#095D40" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#D4AF7F" stopOpacity="0.3" />
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
          strokeWidth={calculateStrokeWidth(20)}
          style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
        />

        {/* Light tan dotted background layer */}
        <path
          d={edgePath}
          fill="none"
          stroke="#D4AF7F"
          strokeWidth={calculateStrokeWidth(selected ? 3.5 : 2.5)}
          strokeDasharray={calculateDashArray()}
          strokeLinecap="round"
          opacity={0.5}
          style={{
            pointerEvents: 'none',
            transition: 'stroke-width 0.2s cubic-bezier(0.4, 0, 0.2, 1), stroke-dasharray 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />

        {/* Animated dark green dotted layer */}
        <path
          d={edgePath}
          fill="none"
          stroke={selected ? '#095D40' : `url(#${animationId})`}
          strokeWidth={calculateStrokeWidth(selected ? 3.5 : 2.5)}
          strokeDasharray={calculateDashArray()}
          strokeLinecap="round"
          strokeDashoffset={0}
          markerEnd={markerEnd}
          style={{
            pointerEvents: 'none',
            animation: 'dash-flow 1.5s linear infinite',
            transition: 'stroke-width 0.2s cubic-bezier(0.4, 0, 0.2, 1), stroke-dasharray 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
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
              stroke-dashoffset: ${-1 * (2 + 6) * Math.pow(1 / Math.max(0.1, Math.min(2, zoom)), 0.5)};
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
