import type { Span } from '@sentry/types';
import * as Sentry from '@sentry/nextjs';

type AIOperationOptions = {
  name: string;
  op?: string;
  metadata?: Record<string, unknown>;
};

export async function withAISpan<T>(options: AIOperationOptions, executor: (span: Span) => Promise<T>): Promise<T> {
  return Sentry.startSpan(
    {
      name: options.name,
      op: options.op ?? 'ai.pipeline',
      attributes: options.metadata,
    },
    async (span) => {
      try {
        const result = await executor(span);
        span.setStatus('ok');
        return result;
      } catch (error) {
        span.setStatus('internal_error');
        throw error;
      }
    }
  );
}

export function recordAIMetadata(metadata: Record<string, unknown>) {
  const sanitizedEntries = Object.entries(metadata).map(([key, value]) => {
    if (typeof value === 'string' && value.length > 256) {
      return [key, `${value.slice(0, 256)}…`];
    }
    return [key, value];
  });

  Sentry.addBreadcrumb({
    category: 'ai',
    level: 'info',
    data: Object.fromEntries(sanitizedEntries),
  });
}

export function summarizeTextLengths(label: string, items: Array<{ id: string; length: number }>) {
  const lengths = items.map((item) => item.length);
  const total = lengths.reduce((sum, len) => sum + len, 0);
  const max = lengths.length > 0 ? Math.max(...lengths) : 0;
  const avg = lengths.length > 0 ? total / lengths.length : 0;

  Sentry.setContext(label, {
    total,
    max,
    average: Math.round(avg * 100) / 100,
    count: lengths.length,
  });
}

