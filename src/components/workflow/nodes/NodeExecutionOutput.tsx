"use client";

import { memo, useState, useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ChevronDown, ChevronUp, Copy, Check, FileJson, Table2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import 'katex/dist/katex.min.css';

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
  defaultExpanded = false,
  compact = false,
}: NodeExecutionOutputProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [viewMode, setViewMode] = useState<'json' | 'table'>('json');
  const [copied, setCopied] = useState(false);

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
          className="nodrag nowheel rounded-lg border border-gray-200 bg-white w-full select-text"
          style={{
            maxHeight: '200px',
            overflowY: 'scroll',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            userSelect: 'text',
            WebkitUserSelect: 'text',
            cursor: 'text',
          }}
          onWheelCapture={(event) => {
            event.stopPropagation();
          }}
          data-flowy-selectable="true"
          onTouchMoveCapture={(event) => {
            event.stopPropagation();
          }}
          onMouseDown={(event) => {
            event.stopPropagation();
          }}
          onPointerDown={(event) => {
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
    <div className={cn('space-y-2 select-text', compact ? 'p-3' : 'p-4')} style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
      <div className="flex items-start gap-2">
        <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1">
          <p className="text-[11px] font-medium text-red-700 select-text">{error.message}</p>
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
        <pre className="text-[9px] text-gray-600 bg-gray-50 rounded p-2 overflow-x-auto font-mono select-text">
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
      'text-[10px] font-mono text-gray-700 whitespace-pre-wrap break-words select-text',
      compact ? 'p-3' : 'p-4'
    )} style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
      {formatted}
    </pre>
  );
}

// Text view component - for AI-generated text output
const CODE_BLOCK_STYLES = {
  background: '#111827',
  borderRadius: '12px',
  fontSize: '12px',
  padding: '14px',
  border: '1px solid rgba(255,255,255,0.08)',
} satisfies CSSProperties;

const InlineCode = ({ children }: { children: ReactNode }) => (
  <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-900">
    {children}
  </code>
);

const MarkdownCodeBlock = ({ inline, className, children }: { inline?: boolean; className?: string; children?: ReactNode }) => {
  const language = /language-(\w+)/.exec(className || '')?.[1] ?? 'text';
  const content = String(children ?? '').replace(/\n$/, '');

  if (inline) {
    return <InlineCode>{children}</InlineCode>;
  }

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-gray-800/60 bg-[#0b1220]">
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        PreTag="div"
        customStyle={CODE_BLOCK_STYLES}
        showLineNumbers={false}
        wrapLines
      >
        {content}
      </SyntaxHighlighter>
    </div>
  );
};

function TextView({ data, compact }: { data: string; compact?: boolean }) {
  return (
    <div
      className={cn(
        'max-w-full break-words space-y-3 text-[12px] leading-relaxed text-gray-900 select-text',
        compact ? 'p-3' : 'p-4'
      )}
      style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code: ({ inline, className, children }) => (
            <MarkdownCodeBlock inline={inline} className={className}>
              {children}
            </MarkdownCodeBlock>
          ),
          pre: ({ children }) => <>{children}</>,
          p: ({ children }) => (
            <p className="text-[12px] text-gray-900 leading-relaxed select-text break-words">{children}</p>
          ),
          h1: ({ children }) => (
            <h1 className="text-[16px] font-semibold text-gray-900 leading-snug mt-4 mb-2 first:mt-0 select-text">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-[15px] font-semibold text-gray-900 leading-snug mt-4 mb-2 first:mt-0 select-text">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[14px] font-semibold text-gray-900 leading-snug mt-3 mb-1 first:mt-0 select-text">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-[13px] font-semibold text-gray-900 leading-snug mt-3 mb-1 first:mt-0 select-text">
              {children}
            </h4>
          ),
          ul: ({ children }) => (
            <ul className="list-disc space-y-1 pl-5 text-[12px] text-gray-900 select-text">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-1 pl-5 text-[12px] text-gray-900 select-text">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed text-gray-900 select-text">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900 select-text">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-gray-900 select-text">{children}</em>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#095D40] underline-offset-2 hover:underline select-text"
              onClick={(event) => event.stopPropagation()}
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-200 bg-gray-50 px-4 py-2 text-[12px] text-gray-800 italic rounded-r select-text">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto rounded-lg border border-gray-200 select-text">
              <table className="w-full text-left text-[12px] text-gray-900">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-100 text-gray-900 select-text">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-[11px] font-semibold text-gray-900 border-b border-gray-200 select-text">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-[11px] text-gray-900 border-b border-gray-100 select-text">
              {children}
            </td>
          ),
          hr: () => <hr className="border-gray-200" />,
        }}
      >
        {data}
      </ReactMarkdown>
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
    return <div className={cn('text-center text-gray-500 select-text', compact ? 'p-3 text-[10px]' : 'p-4 text-[11px]')}>No data to display</div>;
  }

  return (
    <div className="overflow-x-auto select-text" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
      <table className="w-full text-[10px] border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {columns.map((col) => (
              <th
                key={col}
                className={cn(
                  'text-left font-medium text-gray-700 select-text',
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
                    'text-gray-600 select-text',
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
