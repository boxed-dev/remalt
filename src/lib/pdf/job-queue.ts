/**
 * Background Job Queue System for PDF Parsing
 *
 * Simple in-memory queue for handling large PDF parsing jobs
 * Can be upgraded to Redis/BullMQ for production scaling
 */

export interface PDFParseJob {
  id: string;
  pdfIdentifier: string; // uploadcare UUID or hash
  pdfUrl?: string;
  uploadcareCdnUrl?: string;
  fileName?: string;
  fileSize?: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  result?: {
    parsedText?: string;
    segments?: Array<{
      content: string;
      heading?: string;
      page?: number;
    }>;
    pageCount?: number;
    parseMethod?: 'text' | 'gemini' | 'hybrid';
  };
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// In-memory job store
const jobs = new Map<string, PDFParseJob>();

// Job processor callback type
type JobProcessor = (job: PDFParseJob) => Promise<PDFParseJob['result']>;

// Active processor
let processor: JobProcessor | null = null;

// Processing queue
const queue: string[] = [];
let isProcessing = false;

/**
 * Create a new PDF parsing job
 */
export function createJob(
  pdfIdentifier: string,
  options: {
    pdfUrl?: string;
    uploadcareCdnUrl?: string;
    fileName?: string;
    fileSize?: number;
  } = {}
): PDFParseJob {
  const job: PDFParseJob = {
    id: crypto.randomUUID(),
    pdfIdentifier,
    pdfUrl: options.pdfUrl,
    uploadcareCdnUrl: options.uploadcareCdnUrl,
    fileName: options.fileName,
    fileSize: options.fileSize,
    status: 'queued',
    progress: 0,
    createdAt: new Date(),
  };

  jobs.set(job.id, job);
  queue.push(job.id);

  console.log('[Job Queue] Created job:', job.id);

  // Start processing if not already processing
  processNextJob();

  return job;
}

/**
 * Get job by ID
 */
export function getJob(jobId: string): PDFParseJob | undefined {
  return jobs.get(jobId);
}

/**
 * Update job status
 */
export function updateJobStatus(
  jobId: string,
  status: PDFParseJob['status'],
  updates: Partial<PDFParseJob> = {}
): void {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status = status;
  Object.assign(job, updates);

  if (status === 'processing' && !job.startedAt) {
    job.startedAt = new Date();
  }

  if (status === 'completed' || status === 'failed') {
    job.completedAt = new Date();
  }

  jobs.set(jobId, job);
}

/**
 * Update job progress
 */
export function updateJobProgress(jobId: string, progress: number): void {
  const job = jobs.get(jobId);
  if (!job) return;

  job.progress = Math.min(100, Math.max(0, progress));
  jobs.set(jobId, job);
}

/**
 * Complete job with result
 */
export function completeJob(
  jobId: string,
  result: PDFParseJob['result']
): void {
  updateJobStatus(jobId, 'completed', {
    result,
    progress: 100,
  });

  console.log('[Job Queue] Completed job:', jobId);

  // Process next job in queue
  processNextJob();
}

/**
 * Fail job with error
 */
export function failJob(jobId: string, error: string): void {
  updateJobStatus(jobId, 'failed', {
    error,
  });

  console.error('[Job Queue] Failed job:', jobId, error);

  // Process next job in queue
  processNextJob();
}

/**
 * Register job processor function
 */
export function registerProcessor(fn: JobProcessor): void {
  processor = fn;
  console.log('[Job Queue] Processor registered');
}

/**
 * Process next job in queue
 */
async function processNextJob(): Promise<void> {
  if (isProcessing || queue.length === 0 || !processor) {
    return;
  }

  isProcessing = true;

  const jobId = queue.shift();
  if (!jobId) {
    isProcessing = false;
    return;
  }

  const job = jobs.get(jobId);
  if (!job) {
    isProcessing = false;
    return processNextJob();
  }

  console.log('[Job Queue] Processing job:', jobId);
  updateJobStatus(jobId, 'processing', { progress: 10 });

  try {
    const result = await processor(job);
    completeJob(jobId, result);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    failJob(jobId, errorMessage);
  } finally {
    isProcessing = false;
    // Continue processing next job
    processNextJob();
  }
}

/**
 * Get all jobs (for debugging)
 */
export function getAllJobs(): PDFParseJob[] {
  return Array.from(jobs.values());
}

/**
 * Clear completed/failed jobs older than 1 hour
 */
export function cleanupOldJobs(): void {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;

  for (const [jobId, job] of jobs.entries()) {
    if (
      (job.status === 'completed' || job.status === 'failed') &&
      job.completedAt &&
      job.completedAt.getTime() < oneHourAgo
    ) {
      jobs.delete(jobId);
      console.log('[Job Queue] Cleaned up old job:', jobId);
    }
  }
}

// Auto-cleanup every 10 minutes
setInterval(cleanupOldJobs, 10 * 60 * 1000);
