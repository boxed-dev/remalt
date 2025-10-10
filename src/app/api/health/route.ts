import { NextRequest, NextResponse } from 'next/server';

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  latency_ms?: number;
  error?: string;
  details?: Record<string, any>;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: HealthCheckResult[];
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    unknown: number;
  };
}

async function checkService(
  name: string,
  checkFn: () => Promise<{ ok: boolean; details?: any; error?: string }>
): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    const result = await Promise.race([
      checkFn(),
      new Promise<{ ok: boolean; error: string }>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 5000)
      ),
    ]);

    const latency = Date.now() - startTime;

    return {
      service: name,
      status: result.ok ? 'healthy' : 'unhealthy',
      latency_ms: latency,
      error: result.error,
      details: result.details,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      service: name,
      status: 'unhealthy',
      latency_ms: latency,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Check Python API health
async function checkPythonAPI(): Promise<{ ok: boolean; details?: any; error?: string }> {
  try {
    const pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:5001';
    const response = await fetch(`${pythonApiUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    return {
      ok: true,
      details: {
        cache_size: data.cache_size,
        url: pythonApiUrl,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Check Deepgram API configuration
async function checkDeepgram(): Promise<{ ok: boolean; details?: any; error?: string }> {
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    return {
      ok: false,
      error: 'DEEPGRAM_API_KEY not configured',
    };
  }

  return {
    ok: true,
    details: {
      configured: true,
      key_length: apiKey.length,
    },
  };
}

// Check yt-dlp API (optional)
async function checkYtDlpAPI(): Promise<{ ok: boolean; details?: any; error?: string }> {
  const ytDlpApiUrl = process.env.YT_DLP_API_URL;

  if (!ytDlpApiUrl) {
    return {
      ok: true,
      details: {
        configured: false,
        note: 'Optional service not configured',
      },
    };
  }

  try {
    const response = await fetch(`${ytDlpApiUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });

    return {
      ok: response.ok,
      details: {
        configured: true,
        url: ytDlpApiUrl,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Check YouTube Data API (optional)
async function checkYouTubeAPI(): Promise<{ ok: boolean; details?: any; error?: string }> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return {
      ok: true,
      details: {
        configured: false,
        note: 'Optional for channel features',
      },
    };
  }

  try {
    // Simple quota-light check - just verify the key format is valid
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=id&id=jNQXAC9IVRw&key=${apiKey}`,
      {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      }
    );

    return {
      ok: response.ok,
      details: {
        configured: true,
        status: response.status,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function GET(req: NextRequest) {
  console.log('\n=== Health Check Request ===');

  // Run all health checks in parallel
  const checks = await Promise.all([
    checkService('python-api', checkPythonAPI),
    checkService('deepgram', checkDeepgram),
    checkService('yt-dlp-api', checkYtDlpAPI),
    checkService('youtube-api', checkYouTubeAPI),
  ]);

  // Calculate summary
  const summary = {
    total: checks.length,
    healthy: checks.filter(c => c.status === 'healthy').length,
    unhealthy: checks.filter(c => c.status === 'unhealthy').length,
    unknown: checks.filter(c => c.status === 'unknown').length,
  };

  // Determine overall status
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy';

  if (summary.unhealthy === 0) {
    overallStatus = 'healthy';
  } else if (summary.healthy > 0) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'unhealthy';
  }

  const response: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks,
    summary,
  };

  console.log(`[Health Check] Overall Status: ${overallStatus.toUpperCase()}`);
  console.log(`[Health Check] Services: ${summary.healthy}/${summary.total} healthy\n`);

  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 207 : 503;

  return NextResponse.json(response, { status: statusCode });
}
