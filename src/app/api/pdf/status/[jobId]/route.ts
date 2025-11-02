import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/api/auth-middleware';
import { getJob } from '@/lib/pdf/job-queue';

async function getHandler(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  // Require authentication
  const { user, error: authError } = await requireAuth(req);
  if (authError || !user) {
    return unauthorizedResponse('You must be signed in to check job status');
  }

  try {
    const jobId = params.jobId;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const job = getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Return job status
    const response: any = {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
    };

    // Add timing info if available
    if (job.startedAt) {
      response.startedAt = job.startedAt;
    }

    if (job.completedAt) {
      response.completedAt = job.completedAt;
      response.durationMs = job.completedAt.getTime() - job.createdAt.getTime();
    }

    // Add result if completed
    if (job.status === 'completed' && job.result) {
      response.result = {
        parsedText: job.result.parsedText || '',
        segments: job.result.segments || [],
        pageCount: job.result.pageCount || 1,
        parseMethod: job.result.parseMethod,
      };
    }

    // Add error if failed
    if (job.status === 'failed' && job.error) {
      response.error = job.error;
    }

    // Add metadata
    response.metadata = {
      fileName: job.fileName,
      fileSize: job.fileSize,
      fileSizeMB: job.fileSize ? (job.fileSize / (1024 * 1024)).toFixed(2) : undefined,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Job Status Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to get job status';

    return NextResponse.json(
      {
        error: errorMessage,
        status: 'error',
      },
      { status: 500 }
    );
  }
}

export const GET = getHandler;
