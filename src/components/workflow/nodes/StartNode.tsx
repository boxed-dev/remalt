"use client";

import { memo, useState, useCallback } from 'react';
import { Play, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Handle, Position } from '@xyflow/react';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import type { NodeProps } from '@xyflow/react';
import type { NodeData } from '@/types/workflow';

export interface StartNodeData extends NodeData {
  lastExecutionStatus?: 'idle' | 'running' | 'success' | 'error';
  lastExecutionTime?: number;
}

export const StartNode = memo(({ id, data }: NodeProps<StartNodeData>) => {
  const executeWorkflow = useWorkflowStore((state) => state.executeWorkflow);
  const cancelExecution = useWorkflowStore((state) => state.cancelExecution);
  const isExecuting = useWorkflowStore((state) => state.isExecuting);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const workflow = useWorkflowStore((state) => state.workflow);

  const [isRunning, setIsRunning] = useState(false);
  const [showNoConnectionsWarning, setShowNoConnectionsWarning] = useState(false);

  // Check if Start node has any downstream connections
  const hasDownstreamNodes = workflow?.edges.some((e) => e.source === id) || false;

  const handleRunWorkflow = useCallback(async () => {
    if (isExecuting || isRunning) return;

    // Check if there are downstream nodes
    if (!hasDownstreamNodes) {
      setShowNoConnectionsWarning(true);
      setTimeout(() => setShowNoConnectionsWarning(false), 3000);
      return;
    }

    setIsRunning(true);
    setShowNoConnectionsWarning(false);
    updateNodeData(id, {
      lastExecutionStatus: 'running',
    } as Partial<StartNodeData>);

    const startTime = Date.now();

    try {
      await executeWorkflow({ fromNodeId: id });

      const executionTime = Date.now() - startTime;
      updateNodeData(id, {
        lastExecutionStatus: 'success',
        lastExecutionTime: executionTime,
      } as Partial<StartNodeData>);
    } catch {
      updateNodeData(id, {
        lastExecutionStatus: 'error',
      } as Partial<StartNodeData>);
    } finally {
      setIsRunning(false);
    }
  }, [id, isExecuting, isRunning, hasDownstreamNodes, executeWorkflow, updateNodeData]);

  const handleCancel = useCallback(() => {
    cancelExecution();
    setIsRunning(false);
    updateNodeData(id, {
      lastExecutionStatus: 'idle',
    } as Partial<StartNodeData>);
  }, [id, cancelExecution, updateNodeData]);

  const isCurrentlyRunning = isExecuting || isRunning || data.lastExecutionStatus === 'running';

  return (
    <div className="relative">
      {/* Giant Play Button Circle - Clean and Minimal */}
      <button
        onClick={isCurrentlyRunning ? handleCancel : handleRunWorkflow}
        className="relative group"
      >
        <div className={`w-28 h-28 rounded-full border-[3px] flex items-center justify-center transition-all ${
          isCurrentlyRunning
            ? 'border-red-400 bg-red-50 hover:bg-red-100'
            : 'border-gray-300 bg-white hover:border-[#095D40] hover:bg-gray-50 shadow-md hover:shadow-lg'
        }`}>
          {isCurrentlyRunning ? (
            data.lastExecutionStatus === 'running' ? (
              <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
            ) : (
              <XCircle className="h-10 w-10 text-red-600" />
            )
          ) : data.lastExecutionStatus === 'success' ? (
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          ) : (
            <Play className="h-10 w-10 text-[#095D40] fill-[#095D40] group-hover:scale-110 transition-transform" />
          )}
        </div>

        {/* Execution Time */}
        {data.lastExecutionTime && data.lastExecutionStatus === 'success' && !isCurrentlyRunning && (
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 whitespace-nowrap">
            {(data.lastExecutionTime / 1000).toFixed(2)}s
          </div>
        )}
      </button>

      {/* Output handle - right side */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3.5 !h-3.5 !bg-white !border-2 !border-[#9CA3AF] hover:!border-[#095D40] !transition-all"
        style={{ right: '-7px' }}
      />

      {/* Warning: No Connections */}
      {showNoConnectionsWarning && (
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 shadow-lg whitespace-nowrap z-50">
          <div className="text-[11px] font-medium text-amber-700">Connect nodes to trigger execution</div>
        </div>
      )}
    </div>
  );
});

StartNode.displayName = 'StartNode';
