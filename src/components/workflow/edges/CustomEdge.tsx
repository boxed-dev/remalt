'use client';

import { useCallback } from 'react';
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

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleDelete = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      deleteEdge(id);
    },
    [deleteEdge, id]
  );

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected ? 3.5 : 3,
          stroke: selected ? '#095D40' : '#9CA3AF',
          strokeDasharray: selected ? '10 5' : 'none',
          strokeLinecap: 'round',
          transition: 'all 0.2s ease',
        }}
      />
      {selected && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
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
