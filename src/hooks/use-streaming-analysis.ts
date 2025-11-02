import { useState, useCallback } from 'react';
import * as Sentry from '@sentry/nextjs';

interface StreamingState {
  status: 'idle' | 'downloading' | 'analyzing' | 'streaming' | 'complete' | 'error';
  progress: number;
  chunk: string;
  fullText: string;
  error?: string;
  metadata?: Record<string, any>;
}

export function useStreamingAnalysis() {
  const [state, setState] = useState<StreamingState>({
    status: 'idle',
    progress: 0,
    chunk: '',
    fullText: '',
  });

  const startStreaming = useCallback(async (
    url: string,
    body: Record<string, any>,
    onComplete?: (data: any) => void
  ) => {
    setState({
      status: 'downloading',
      progress: 0,
      chunk: '',
      fullText: '',
    });

    await Sentry.startSpan(
      {
        name: 'Streaming Analysis',
        op: 'ai.client',
        attributes: {
          endpoint: url,
        },
      },
      async () => {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('Response body is not readable');
          }

          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');

            // Keep the last incomplete line in the buffer
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));

                  if (data.status === 'downloading') {
                    setState(prev => ({
                      ...prev,
                      status: 'downloading',
                      progress: data.progress || 0,
                      metadata: data,
                    }));
                  } else if (data.status === 'analyzing') {
                    setState(prev => ({
                      ...prev,
                      status: 'analyzing',
                      progress: data.progress || 30,
                      metadata: data,
                    }));
                  } else if (data.status === 'streaming') {
                    setState(prev => ({
                      ...prev,
                      status: 'streaming',
                      progress: data.progress || 50,
                      chunk: data.chunk || '',
                      fullText: prev.fullText + (data.chunk || ''),
                    }));
                  } else if (data.status === 'complete') {
                    setState(prev => ({
                      ...prev,
                      status: 'complete',
                      progress: 100,
                      metadata: data,
                    }));

                    if (onComplete) {
                      onComplete(data);
                    }
                  } else if (data.status === 'error') {
                    setState(prev => ({
                      ...prev,
                      status: 'error',
                      error: data.error || 'Unknown error',
                    }));
                  }
                } catch (e) {
                  console.error('Failed to parse SSE data:', e);
                  Sentry.captureException(e, {
                    tags: { feature: 'streaming-analysis' },
                    extra: { endpoint: url, rawLine: line },
                  });
                }
              }
            }
          }
        } catch (error) {
          console.error('Streaming error:', error);
          Sentry.captureException(error, {
            tags: {
              feature: 'streaming-analysis',
            },
            extra: {
              endpoint: url,
            },
          });
          setState(prev => ({
            ...prev,
            status: 'error',
            error: error instanceof Error ? error.message : 'Streaming failed',
          }));
        }
      }
    );
  }, []);

  const reset = useCallback(() => {
    setState({
      status: 'idle',
      progress: 0,
      chunk: '',
      fullText: '',
    });
  }, []);

  return {
    state,
    startStreaming,
    reset,
    isLoading: state.status === 'downloading' || state.status === 'analyzing' || state.status === 'streaming',
    isComplete: state.status === 'complete',
    isError: state.status === 'error',
  };
}
