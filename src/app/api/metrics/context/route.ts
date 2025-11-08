import { NextRequest, NextResponse } from 'next/server';
import { contextMetrics, logMetricsSummary } from '@/lib/monitoring/context-metrics';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/metrics/context
 * Returns context usage metrics and RAG recommendation
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const summary = contextMetrics.getSummary();
    const userMetrics = contextMetrics.getUserMetrics(user.id);

    return NextResponse.json({
      overall: summary,
      user: userMetrics,
      recommendation: getRecommendation(summary, userMetrics),
    });
  } catch (error) {
    console.error('[Metrics API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}

function getRecommendation(overall: any, user: any) {
  if (!overall && !user) {
    return {
      status: 'insufficient_data',
      message: 'Not enough data yet. Keep using the app.',
      nextStep: 'monitor',
    };
  }

  // Check if RAG is needed
  if (overall?.needsRAG || user?.needsRAG) {
    return {
      status: 'needs_rag',
      message: 'Your usage patterns suggest RAG (Phase 2) would significantly improve performance.',
      reasons: [
        overall?.needsRAG ? `${overall.dropRate} of queries drop content (>10% threshold)` : null,
        user?.needsRAG ? `You frequently have ${user.maxNodes} nodes (power user)` : null,
        overall?.maxUtilization > 90 ? `Budget utilization at ${overall.maxUtilization}` : null,
      ].filter(Boolean),
      nextStep: 'implement_rag',
      benefits: [
        '155x cost reduction ($0.70 → $0.0015 per query)',
        '5-10x faster responses (1.5-4 sec vs 18-35 sec)',
        'Unlimited context (10K+ nodes supported)',
        'No more dropped content',
      ],
    };
  }

  // Phase 1 is sufficient
  return {
    status: 'phase1_sufficient',
    message: 'Phase 1 optimizations are working well. No urgent action needed.',
    stats: {
      dropRate: overall?.dropRate || '0%',
      avgUtilization: overall?.avgUtilization || 'N/A',
      userMaxNodes: user?.maxNodes || 0,
    },
    nextStep: 'continue_monitoring',
    note: 'Consider RAG when you see frequent drops or budget >85% consistently',
  };
}
