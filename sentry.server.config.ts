// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import { profilingIntegration } from '@sentry/profiling-node';

const environment = process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV;
const parseRate = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const defaultTraceRate = parseRate(process.env.SENTRY_TRACES_SAMPLE_RATE, 0.2);
const apiTraceRate = parseRate(process.env.SENTRY_API_TRACES_SAMPLE_RATE, 1);

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment,
  enabled: !!process.env.SENTRY_DSN,

  // Smart sampling: 100% for API routes, 20% for pages
  tracesSampler(samplingContext) {
    const transactionName = samplingContext?.transactionContext?.name ?? '';
    if (transactionName.startsWith('api/')) {
      return apiTraceRate;
    }
    return defaultTraceRate;
  },

  profilesSampleRate: parseRate(process.env.SENTRY_PROFILES_SAMPLE_RATE, 0.2),
  tunnel: '/monitoring',
  tracePropagationTargets: [
    'localhost',
    /^https?:\/\/([^/]+\.)?flowy\.app/,
  ],

  // Enable experimental logging feature
  _experiments: {
    enableLogs: true,
  },

  integrations: [
    profilingIntegration(),
    Sentry.consoleLoggingIntegration({ levels: ['log', 'warn', 'error'] }),
  ],

  // Security: Filter sensitive data before sending to Sentry
  beforeSend(event, hint) {
    // Remove authorization headers
    if (event.request?.headers) {
      const headers = { ...event.request.headers } as Record<string, unknown>;
      delete headers.authorization;
      delete headers.cookie;
      event.request.headers = headers;
    }

    // Filter request data
    if (event.request?.data) {
      event.request.data = '[Filtered]';
    }

    // Filter cancelled/aborted errors (noise)
    if (hint?.originalException instanceof Error) {
      const message = hint.originalException.message.toLowerCase();
      if (message.includes('cancelled') || message.includes('aborted')) {
        return null;
      }
    }

    // Filter AI prompts and outputs from extra data
    if (event.extra) {
      for (const key of Object.keys(event.extra)) {
        if (/(prompt|output|content|password|secret|token|key)/i.test(key)) {
          event.extra[key] = '[Filtered]';
        }
      }
    }

    return event;
  },
});
