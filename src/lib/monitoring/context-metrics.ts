/**
 * Context usage metrics for monitoring and decision-making
 * Use this data to determine if RAG (Phase 2) is needed
 */

export interface ContextMetrics {
  timestamp: string;
  userId: string;
  sessionId?: string;
  originalNodeCount: number;
  includedNodeCount: number;
  droppedNodeCount: number;
  truncatedNodeCount: number;
  estimatedTokens: number;
  budgetUtilization: number; // 0-100%
  modelUsed: string;
  responseLatency?: number;
}

class ContextMetricsCollector {
  private metrics: ContextMetrics[] = [];
  private readonly MAX_STORED = 1000; // Keep last 1000 queries in memory

  /**
   * Record context usage for a query
   */
  record(metric: ContextMetrics) {
    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.MAX_STORED) {
      this.metrics.shift();
    }

    // Log warning if content was dropped
    if (metric.droppedNodeCount > 0) {
      console.warn('[Metrics] ⚠️ Content dropped:', {
        userId: metric.userId,
        dropped: metric.droppedNodeCount,
        total: metric.originalNodeCount,
        utilization: metric.budgetUtilization.toFixed(1) + '%',
      });
    }

    // Log if approaching budget limit
    if (metric.budgetUtilization > 85) {
      console.warn('[Metrics] 🔴 High budget usage:', {
        userId: metric.userId,
        utilization: metric.budgetUtilization.toFixed(1) + '%',
        tokens: metric.estimatedTokens,
      });
    }
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    if (this.metrics.length === 0) return null;

    const total = this.metrics.length;
    const withDrops = this.metrics.filter(m => m.droppedNodeCount > 0).length;
    const avgUtilization = this.metrics.reduce((sum, m) => sum + m.budgetUtilization, 0) / total;
    const avgTokens = this.metrics.reduce((sum, m) => sum + m.estimatedTokens, 0) / total;
    const maxUtilization = Math.max(...this.metrics.map(m => m.budgetUtilization));

    return {
      totalQueries: total,
      queriesWithDrops: withDrops,
      dropRate: ((withDrops / total) * 100).toFixed(1) + '%',
      avgUtilization: avgUtilization.toFixed(1) + '%',
      avgTokens: Math.round(avgTokens),
      maxUtilization: maxUtilization.toFixed(1) + '%',
      needsRAG: withDrops > total * 0.1 || maxUtilization > 90, // >10% drop rate or hitting limits
    };
  }

  /**
   * Get metrics for a specific user
   */
  getUserMetrics(userId: string) {
    const userMetrics = this.metrics.filter(m => m.userId === userId);
    if (userMetrics.length === 0) return null;

    const total = userMetrics.length;
    const withDrops = userMetrics.filter(m => m.droppedNodeCount > 0).length;
    const avgNodes = userMetrics.reduce((sum, m) => sum + m.originalNodeCount, 0) / total;
    const maxNodes = Math.max(...userMetrics.map(m => m.originalNodeCount));

    return {
      totalQueries: total,
      queriesWithDrops: withDrops,
      avgNodes: Math.round(avgNodes),
      maxNodes,
      isPowerUser: maxNodes > 300,
      needsRAG: withDrops > total * 0.2, // >20% of queries drop content
    };
  }

  /**
   * Export metrics for analysis
   */
  export() {
    return this.metrics;
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics = [];
  }
}

// Singleton instance
export const contextMetrics = new ContextMetricsCollector();

/**
 * Helper to log metrics summary periodically
 */
export function logMetricsSummary() {
  const summary = contextMetrics.getSummary();
  if (!summary) {
    console.log('[Metrics] No data yet');
    return;
  }

  console.log('\n=== Context Metrics Summary ===');
  console.log(`Total Queries: ${summary.totalQueries}`);
  console.log(`Queries with Drops: ${summary.queriesWithDrops} (${summary.dropRate})`);
  console.log(`Avg Token Usage: ${summary.avgTokens}`);
  console.log(`Avg Utilization: ${summary.avgUtilization}`);
  console.log(`Max Utilization: ${summary.maxUtilization}`);
  console.log(`⚠️ NEEDS RAG: ${summary.needsRAG ? 'YES - Consider Phase 2' : 'NO - Phase 1 is sufficient'}`);
  console.log('==============================\n');
}
