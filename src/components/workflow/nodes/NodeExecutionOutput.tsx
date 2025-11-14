"use client";

import { memo, useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Copy, Check, FileJson, Table2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NodeExecutionOutputProps {
  output?: unknown;
  error?: {
    message: string;
    details?: unknown;
    stack?: string;
  };
  lastExecutedAt?: string;
  executionTime?: number;
  defaultExpanded?: boolean;
  compact?: boolean;
}

export const NodeExecutionOutput = memo(({
  output,
  error,
  lastExecutedAt,
  executionTime,
  defaultExpanded = false,
  compact = false,
}: NodeExecutionOutputProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [viewMode, setViewMode] = useState<'json' | 'table'>('json');
  const [copied, setCopied] = useState(false);

  // Compute formatted timestamp before any early returns (React Hooks rules)
  const formattedTimestamp = useMemo(() => {
    if (!lastExecutedAt) return null;
    const date = new Date(lastExecutedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    // Less than 1 minute ago
    if (diffMs < 60000) {
      return 'just now';
    }
    // Less than 1 hour ago
    if (diffMs < 3600000) {
      const minutes = Math.floor(diffMs / 60000);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    // Less than 24 hours ago
    if (diffMs < 86400000) {
      const hours = Math.floor(diffMs / 3600000);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    // More than 24 hours ago - show date
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [lastExecutedAt]);

  // Try to detect if output is array (for table view)
  const isArrayOutput = Array.isArray(output);
  const canShowTable = isArrayOutput && output.length > 0 && typeof output[0] === 'object';

  // Don't render if there's no output or error
  if (!output && !error) {
    return null;
  }

  const handleCopy = async () => {
    const textToCopy = error
      ? JSON.stringify(error, null, 2)
      : JSON.stringify(output, null, 2);

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      className={cn(
        'border-t border-gray-200 bg-gray-50/50 w-full overflow-x-hidden',
        compact ? 'space-y-2 p-3' : 'space-y-3 p-4'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={toggleExpanded}
          className="flex items-center gap-2 text-[11px] font-medium text-gray-700 hover:text-gray-900 transition-colors"
        >
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
          <span>{error ? 'Execution Error' : 'Output'}</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Timestamp and execution time */}
          {!error && (formattedTimestamp || executionTime !== undefined) && (
            <span className="text-[10px] text-gray-500">
              {formattedTimestamp}
              {executionTime !== undefined && ` • ${formatTime(executionTime)}`}
            </span>
          )}

          {/* View mode toggle */}
          {!error && isExpanded && canShowTable && (
            <div className="flex items-center rounded border border-gray-200 bg-white">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setViewMode('json');
                }}
                className={cn(
                  'flex items-center gap-1 px-1.5 py-0.5 text-[10px] transition-colors',
                  viewMode === 'json'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                )}
                title="JSON view"
              >
                <FileJson className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setViewMode('table');
                }}
                className={cn(
                  'flex items-center gap-1 px-1.5 py-0.5 text-[10px] transition-colors',
                  viewMode === 'table'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                )}
                title="Table view"
              >
                <Table2 className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-gray-500 hover:bg-white hover:text-gray-700 transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-600" />
                <span className="text-emerald-600">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div
          className="rounded-lg border border-gray-200 bg-white w-full"
          style={{
            maxHeight: '200px',
            overflowY: 'scroll',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
          }}
          onWheelCapture={(event) => {
            event.stopPropagation();
          }}
          onTouchMoveCapture={(event) => {
            event.stopPropagation();
          }}
        >
          {error ? (
            <ErrorView error={error} compact={compact} />
          ) : viewMode === 'table' && canShowTable ? (
            <TableView data={output as Record<string, unknown>[]} compact={compact} />
          ) : output && typeof output === 'object' && 'processedOutput' in output && typeof output.processedOutput === 'string' ? (
            <TextView data={output.processedOutput as string} compact={compact} />
          ) : (
            <JSONView data={output} compact={compact} />
          )}
        </div>
      )}
    </div>
  );
});

NodeExecutionOutput.displayName = 'NodeExecutionOutput';

// Error view component
function ErrorView({ error, compact }: { error: { message: string; details?: unknown; stack?: string }; compact?: boolean }) {
  const [showStack, setShowStack] = useState(false);

  return (
    <div className={cn('space-y-2', compact ? 'p-3' : 'p-4')}>
      <div className="flex items-start gap-2">
        <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1">
          <p className="text-[11px] font-medium text-red-700">{error.message}</p>
          {error.stack && (
            <button
              onClick={() => setShowStack(!showStack)}
              className="text-[10px] text-red-600 hover:text-red-700 underline"
            >
              {showStack ? 'Hide' : 'Show'} stack trace
            </button>
          )}
        </div>
      </div>
      {showStack && error.stack && (
        <pre className="text-[9px] text-gray-600 bg-gray-50 rounded p-2 overflow-x-auto font-mono">
          {error.stack}
        </pre>
      )}
    </div>
  );
}

// JSON view component
function JSONView({ data, compact }: { data: unknown; compact?: boolean }) {
  const formatted = useMemo(() => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }, [data]);

  return (
    <pre className={cn(
      'text-[10px] font-mono text-gray-700 whitespace-pre-wrap break-words',
      compact ? 'p-3' : 'p-4'
    )}>
      {formatted}
    </pre>
  );
}

// Text view component - for AI-generated text output
function TextView({ data, compact }: { data: string; compact?: boolean }) {
  // Simple markdown-like formatting
  const formatText = (text: string) => {
    return text
      .split('\n')
      .map((line, idx) => {
        // Headers
        if (line.startsWith('### ')) {
          return <h3 key={idx} className="font-bold text-[12px] mt-2 mb-1">{line.substring(4)}</h3>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={idx} className="font-bold text-[13px] mt-3 mb-1">{line.substring(3)}</h2>;
        }
        if (line.startsWith('# ')) {
          return <h1 key={idx} className="font-bold text-[14px] mt-3 mb-2">{line.substring(2)}</h1>;
        }
        // Bullet points
        if (line.startsWith('* ') || line.startsWith('- ')) {
          return <li key={idx} className="ml-4">{line.substring(2)}</li>;
        }
        // Bold
        if (line.includes('**')) {
          const parts = line.split('**');
          return (
            <p key={idx} className="mb-1">
              {parts.map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part)}
            </p>
          );
        }
        // Regular line
        if (line.trim()) {
          return <p key={idx} className="mb-1">{line}</p>;
        }
        // Empty line
        return <br key={idx} />;
      });
  };

  return (
    <div className={cn(
      'text-[11px] text-gray-800 leading-relaxed break-words max-w-full',
      compact ? 'p-3' : 'p-4'
    )}>
      {formatText(data)}
    </div>
  );
}

// Table view component
function TableView({ data, compact }: { data: Record<string, unknown>[]; compact?: boolean }) {
  const columns = useMemo(() => {
    if (data.length === 0) return [];
    const allKeys = new Set<string>();
    data.forEach((row) => {
      Object.keys(row).forEach((key) => allKeys.add(key));
    });
    return Array.from(allKeys);
  }, [data]);

  if (columns.length === 0 || data.length === 0) {
    return <div className={cn('text-center text-gray-500', compact ? 'p-3 text-[10px]' : 'p-4 text-[11px]')}>No data to display</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[10px] border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {columns.map((col) => (
              <th
                key={col}
                className={cn(
                  'text-left font-medium text-gray-700',
                  compact ? 'px-2 py-1.5' : 'px-3 py-2'
                )}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
              {columns.map((col) => (
                <td
                  key={col}
                  className={cn(
                    'text-gray-600',
                    compact ? 'px-2 py-1.5' : 'px-3 py-2'
                  )}
                >
                  {formatCellValue(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Helper: Format cell value
function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '—';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

// Helper: Format time
function formatTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}
