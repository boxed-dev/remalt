import { NextRequest, NextResponse } from 'next/server';

const SENTRY_HOST = 'sentry.io';
const SENTRY_PROJECT_IDS = process.env.SENTRY_PROJECT_IDS?.split(',') || [];

async function postHandler(request: NextRequest) {
  try {
    const envelope = await request.text();
    const pieces = envelope.split('\n');
    const header = JSON.parse(pieces[0]);

    if (!header.dsn) {
      return NextResponse.json({ error: 'Missing DSN' }, { status: 400 });
    }

    const dsnUrl = new URL(header.dsn);
    const projectId = dsnUrl.pathname.replace('/', '');

    if (SENTRY_PROJECT_IDS.length > 0 && !SENTRY_PROJECT_IDS.includes(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 403 });
    }

    const sentryIngestUrl = `https://${SENTRY_HOST}/api/${projectId}/envelope/`;

    const response = await fetch(sentryIngestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
      },
      body: envelope,
    });

    if (!response.ok) {
      console.error('Sentry tunnel error:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to forward to Sentry' },
        { status: response.status }
      );
    }

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error('Sentry tunnel error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = postHandler;
