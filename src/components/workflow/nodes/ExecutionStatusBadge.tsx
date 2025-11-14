"use client";

import { CheckCircle2, XCircle, Loader2, Ban, Clock } from 'lucide-react';
import { memo, useMemo } from 'react';
import { NodeHeaderBadge } from './NodeHeader';

interface ExecutionStatusBadgeProps {
  status?: 'idle' | 'running' | 'success' | 'error' | 'bypassed';
  executionTime?: number; // in milliseconds
  showTime?: boolean;
  size?: 'sm' | 'md';
}

export const ExecutionStatusBadge = memo(({
  status = 'idle',
  executionTime,
  showTime = false,
  size = 'sm',
}: ExecutionStatusBadgeProps) => {
  const badge = useMemo(() => {
    switch (status) {
      case 'running':
        return (
          <NodeHeaderBadge tone="accent">
            <Loader2 className={`${size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} animate-spin`} />
            <span>Running</span>
          </NodeHeaderBadge>
        );

      case 'success':
        return (
          <NodeHeaderBadge tone="success">
            <CheckCircle2 className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
            <span>
              {showTime && executionTime !== undefined
                ? `${formatExecutionTime(executionTime)}`
                : 'Success'}
            </span>
          </NodeHeaderBadge>
        );

      case 'error':
        return (
          <NodeHeaderBadge tone="danger">
            <XCircle className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
            <span>Error</span>
          </NodeHeaderBadge>
        );

      case 'bypassed':
        return (
          <NodeHeaderBadge tone="muted">
            <Ban className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
            <span>Skipped</span>
          </NodeHeaderBadge>
        );

      case 'idle':
      default:
        // Show subtle idle state if there's execution time (meaning it ran before)
        if (executionTime !== undefined && executionTime > 0) {
          return (
            <NodeHeaderBadge tone="muted">
              <Clock className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
              <span>{formatExecutionTime(executionTime)}</span>
            </NodeHeaderBadge>
          );
        }
        return null;
    }
  }, [status, executionTime, showTime, size]);

  return badge;
});

ExecutionStatusBadge.displayName = 'ExecutionStatusBadge';

/**
 * Format execution time in human-readable format
 */
function formatExecutionTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}
