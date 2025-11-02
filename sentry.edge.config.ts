// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

const environment = process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV;
const parseRate = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment,
  enabled: !!process.env.SENTRY_DSN,
  tracesSampleRate: parseRate(process.env.SENTRY_TRACES_SAMPLE_RATE, 0.2),
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
    Sentry.consoleLoggingIntegration({ levels: ['log', 'warn', 'error'] }),
  ],

  // Security: Filter sensitive data before sending to Sentry
  beforeSend(event) {
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
