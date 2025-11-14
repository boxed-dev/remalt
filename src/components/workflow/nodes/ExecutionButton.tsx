"use client";

import { Play, Loader2, RotateCcw } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { cn } from '@/lib/utils';

interface ExecutionButtonProps {
  nodeId: string;
  nodeType: string;
  executionStatus?: 'idle' | 'running' | 'success' | 'error' | 'bypassed';
  size?: 'sm' | 'md';
  variant?: 'icon' | 'full';
  forceExecution?: boolean;
  onExecutionStart?: () => void;
  onExecutionComplete?: () => void;
  onExecutionError?: (error: string) => void;
}

export const ExecutionButton = memo(({
  nodeId,
  nodeType,
  executionStatus = 'idle',
  size = 'sm',
  variant = 'icon',
  forceExecution = false,
  onExecutionStart,
  onExecutionComplete,
  onExecutionError,
}: ExecutionButtonProps) => {
  const executeNode = useWorkflowStore((state) => state.executeNode);
  const [isExecuting, setIsExecuting] = useState(false);

  // Structure nodes don't execute
  const isStructureNode = nodeType === 'connector' || nodeType === 'group' || nodeType === 'sticky';

  const handleExecute = useCallback(async (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();

    if (isExecuting || isStructureNode) return;

    setIsExecuting(true);
    onExecutionStart?.();

    try {
      await executeNode(nodeId, { forceExecution });
      onExecutionComplete?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Execution failed';
      onExecutionError?.(errorMessage);
    } finally {
      setIsExecuting(false);
    }
  }, [nodeId, forceExecution, isExecuting, isStructureNode, executeNode, onExecutionStart, onExecutionComplete, onExecutionError]);

  // Don't render for structure nodes
  if (isStructureNode) {
    return null;
  }

  const isRunning = executionStatus === 'running' || isExecuting;
  const hasRun = executionStatus === 'success' || executionStatus === 'error';

  // Icon size based on button size
  const iconClass = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  if (variant === 'icon') {
    return (
      <button
        onClick={handleExecute}
        disabled={isRunning}
        className={cn(
          'flex items-center justify-center rounded-md transition-all duration-150',
          'hover:bg-white/80 active:scale-95',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          size === 'sm' ? 'h-6 w-6' : 'h-7 w-7',
        )}
        title={hasRun ? 'Re-run node' : 'Run node'}
        aria-label={hasRun ? 'Re-run node' : 'Run node'}
      >
        {isRunning ? (
          <Loader2 className={cn(iconClass, 'animate-spin text-blue-600')} />
        ) : hasRun ? (
          <RotateCcw className={cn(iconClass, 'text-gray-600 hover:text-emerald-600')} />
        ) : (
          <Play className={cn(iconClass, 'text-gray-600 hover:text-emerald-600')} />
        )}
      </button>
    );
  }

  // Full variant with text
  return (
    <button
      onClick={handleExecute}
      disabled={isRunning}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-150',
        'hover:shadow-sm active:scale-[0.98]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'sm'
          ? 'px-2.5 py-1 text-[10px]'
          : 'px-3 py-1.5 text-[11px]',
        hasRun
          ? 'bg-white border border-gray-200 text-gray-700 hover:border-emerald-400 hover:text-emerald-700'
          : 'bg-emerald-600 text-white hover:bg-emerald-700',
      )}
      aria-label={hasRun ? 'Re-run node' : 'Run node'}
    >
      {isRunning ? (
        <>
          <Loader2 className={cn(iconClass, 'animate-spin')} />
          <span>Running...</span>
        </>
      ) : hasRun ? (
        <>
          <RotateCcw className={iconClass} />
          <span>Re-run</span>
        </>
      ) : (
        <>
          <Play className={iconClass} />
          <span>Run</span>
        </>
      )}
    </button>
  );
});

ExecutionButton.displayName = 'ExecutionButton';
