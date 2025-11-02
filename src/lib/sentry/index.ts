import * as Sentry from '@sentry/nextjs';

export const captureError = (error: unknown, context?: Sentry.CaptureContext) => {
  if (error instanceof Error) {
    Sentry.captureException(error, context);
  } else {
    Sentry.captureMessage(typeof error === 'string' ? error : 'Unknown error', {
      level: 'error',
      extra: context?.extra,
    });
  }
};

export const startSpan = Sentry.startSpan.bind(Sentry);
export const addBreadcrumb = Sentry.addBreadcrumb.bind(Sentry);
export const setContext = Sentry.setContext.bind(Sentry);

