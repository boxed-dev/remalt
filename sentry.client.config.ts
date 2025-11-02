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
  tracesSampleRate: parseRate(process.env.SENTRY_TRACES_SAMPLE_RATE, 0.1),
  tracePropagationTargets: [
    'localhost',
    /^https?:\/\/([^/]+\.)?flowy\.app/,
  ],
  profilesSampleRate: parseRate(process.env.SENTRY_PROFILES_SAMPLE_RATE, 0.05),
  replaysSessionSampleRate: parseRate(process.env.SENTRY_REPLAYS_SESSION_SAMPLE_RATE, 0.02),
  replaysOnErrorSampleRate: parseRate(process.env.SENTRY_REPLAYS_ERROR_SAMPLE_RATE, 1),
  tunnel: '/monitoring',
  _experiments: {
    enableLogs: true,
  },
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.consoleLoggingIntegration({ levels: ['log', 'warn', 'error'] }),
  ],
  beforeSend(event) {
    if (event.request?.headers) {
      const headers = { ...event.request.headers } as Record<string, unknown>;
      delete headers.authorization;
      event.request.headers = headers;
    }

    if (event.request?.data) {
      event.request.data = '[Filtered]';
    }

    if (event.extra) {
      for (const key of Object.keys(event.extra)) {
        if (/(prompt|output|content)/i.test(key)) {
          event.extra[key] = '[Filtered]';
        }
      }
    }

    return event;
  },
});

