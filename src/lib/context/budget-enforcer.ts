import { TokenBudget, estimateTokens, truncateToTokenBudget } from './token-counter';

export interface ContextArrays {
  textContext: any[];
  youtubeTranscripts: any[];
  voiceTranscripts: any[];
  pdfDocuments: any[];
  images: any[];
  webpages: any[];
  instagramReels: any[];
  linkedInPosts: any[];
  mindMaps: any[];
  templates: any[];
}

interface ContextItem {
  data: any;
  type: string;
  priority: number;
  estimatedTokens: number;
  content: string;
}

/**
 * Calculate priority score for a context item
 * Higher score = higher priority = included first
 */
function calculatePriority(item: any, type: string): number {
  let score = 0;

  // Metadata-based prioritization
  const metadata = item.metadata || item.contextMetadata || {};

  // Recently edited items get MUCH higher priority (user is actively working on them)
  if (metadata.lastEditedAt) {
    const editTime = new Date(metadata.lastEditedAt).getTime();
    const now = Date.now();
    const daysSinceEdit = (now - editTime) / (1000 * 60 * 60 * 24);

    // Edited in last hour: +500, last day: +200, last week: +100, last month: +50
    if (daysSinceEdit < 0.04) score += 500; // Last hour
    else if (daysSinceEdit < 1) score += 200;
    else if (daysSinceEdit < 7) score += 100;
    else if (daysSinceEdit < 30) score += 50;
  }

  // Items with AI instructions get HIGHEST priority (user explicitly wants them used)
  if (item.aiInstructions && item.aiInstructions.trim()) {
    score += 300;
  }

  // Content type priority (some types are more valuable)
  const typePriority: Record<string, number> = {
    youtube: 100, // Rich transcripts - users expect full content
    instagram: 100, // Analyzed videos - expensive processing
    linkedin: 90,
    pdf: 80, // Structured documents - important
    webpage: 70,
    text: 60, // User-created content - respect user's work
    voice: 50,
    image: 40,
    mindmap: 30,
    template: 20,
  };
  score += typePriority[type] || 0;

  // Group path depth (deeper = more specific = higher priority)
  if (metadata.groupPath) {
    const depth = metadata.groupPath.split(' > ').length;
    score += depth * 10; // Increased from 5
  }

  return score;
}

/**
 * Extract main content from an item for token estimation
 */
function extractContent(item: any, type: string): string {
  switch (type) {
    case 'youtube':
      return item.transcript || '';
    case 'pdf':
      if (item.segments && Array.isArray(item.segments)) {
        return item.segments.map((s: any) => s.content || '').join('\n');
      }
      return item.parsedText || '';
    case 'text':
      return typeof item === 'string' ? item : (item.content || '');
    case 'voice':
      return item.transcript || '';
    case 'webpage':
      return item.pageContent || item.content || '';
    case 'instagram':
      return [item.caption, item.fullAnalysis, item.transcript].filter(Boolean).join('\n');
    case 'linkedin':
      return [item.content, item.fullAnalysis].filter(Boolean).join('\n');
    case 'image':
      return [item.description, item.ocrText, item.caption].filter(Boolean).join('\n');
    case 'mindmap':
      return item.content || '';
    case 'template':
      return item.generatedContent || item.content || '';
    default:
      return '';
  }
}

/**
 * Truncate an item's content to fit within budget
 */
function truncateItem(item: any, type: string, maxTokens: number): any {
  const content = extractContent(item, type);
  if (!content) return item;

  const { text: truncatedContent, truncated } = truncateToTokenBudget(content, maxTokens);

  if (!truncated) return item;

  // Create truncated copy
  const truncatedItem = { ...item };

  switch (type) {
    case 'youtube':
      truncatedItem.transcript = truncatedContent;
      truncatedItem._truncated = true;
      break;
    case 'pdf':
      if (truncatedItem.segments) {
        // Truncate segments proportionally
        truncatedItem.segments = truncatedItem.segments.map((s: any, idx: number) => {
          if (idx === truncatedItem.segments.length - 1) {
            return { ...s, content: truncatedContent };
          }
          return s;
        });
      } else {
        truncatedItem.parsedText = truncatedContent;
      }
      truncatedItem._truncated = true;
      break;
    case 'text':
      if (typeof truncatedItem === 'string') {
        return truncatedContent;
      }
      truncatedItem.content = truncatedContent;
      truncatedItem._truncated = true;
      break;
    case 'voice':
    case 'webpage':
    case 'instagram':
    case 'linkedin':
      // For these, truncate the longest field
      if (truncatedItem.fullAnalysis) {
        truncatedItem.fullAnalysis = truncatedContent;
      } else if (truncatedItem.transcript) {
        truncatedItem.transcript = truncatedContent;
      } else if (truncatedItem.content) {
        truncatedItem.content = truncatedContent;
      }
      truncatedItem._truncated = true;
      break;
    default:
      truncatedItem._truncated = true;
  }

  return truncatedItem;
}

/**
 * Enforce token budget on context arrays
 * Returns filtered and truncated arrays that fit within budget
 */
export function enforceTokenBudget(
  context: ContextArrays,
  maxTokens = 200000 // Use 200K tokens - allows ~400 nodes before any drops (Gemini 2.5 Pro = 2M context window)
): {
  filtered: ContextArrays;
  stats: {
    originalCount: number;
    filteredCount: number;
    estimatedTokens: number;
    budget: number;
    truncatedItems: number;
    droppedItems: number;
  };
} {
  const budget = new TokenBudget(maxTokens);

  // Flatten all items with metadata
  const allItems: ContextItem[] = [
    ...context.textContext.map((item, idx) => ({
      data: item,
      type: 'text',
      index: idx,
      priority: calculatePriority(item, 'text'),
      content: extractContent(item, 'text'),
      estimatedTokens: estimateTokens(extractContent(item, 'text')),
    })),
    ...context.youtubeTranscripts.map((item, idx) => ({
      data: item,
      type: 'youtube',
      index: idx,
      priority: calculatePriority(item, 'youtube'),
      content: extractContent(item, 'youtube'),
      estimatedTokens: estimateTokens(extractContent(item, 'youtube')),
    })),
    ...context.voiceTranscripts.map((item, idx) => ({
      data: item,
      type: 'voice',
      index: idx,
      priority: calculatePriority(item, 'voice'),
      content: extractContent(item, 'voice'),
      estimatedTokens: estimateTokens(extractContent(item, 'voice')),
    })),
    ...context.pdfDocuments.map((item, idx) => ({
      data: item,
      type: 'pdf',
      index: idx,
      priority: calculatePriority(item, 'pdf'),
      content: extractContent(item, 'pdf'),
      estimatedTokens: estimateTokens(extractContent(item, 'pdf')),
    })),
    ...context.images.map((item, idx) => ({
      data: item,
      type: 'image',
      index: idx,
      priority: calculatePriority(item, 'image'),
      content: extractContent(item, 'image'),
      estimatedTokens: estimateTokens(extractContent(item, 'image')),
    })),
    ...context.webpages.map((item, idx) => ({
      data: item,
      type: 'webpage',
      index: idx,
      priority: calculatePriority(item, 'webpage'),
      content: extractContent(item, 'webpage'),
      estimatedTokens: estimateTokens(extractContent(item, 'webpage')),
    })),
    ...context.instagramReels.map((item, idx) => ({
      data: item,
      type: 'instagram',
      index: idx,
      priority: calculatePriority(item, 'instagram'),
      content: extractContent(item, 'instagram'),
      estimatedTokens: estimateTokens(extractContent(item, 'instagram')),
    })),
    ...context.linkedInPosts.map((item, idx) => ({
      data: item,
      type: 'linkedin',
      index: idx,
      priority: calculatePriority(item, 'linkedin'),
      content: extractContent(item, 'linkedin'),
      estimatedTokens: estimateTokens(extractContent(item, 'linkedin')),
    })),
    ...context.mindMaps.map((item, idx) => ({
      data: item,
      type: 'mindmap',
      index: idx,
      priority: calculatePriority(item, 'mindmap'),
      content: extractContent(item, 'mindmap'),
      estimatedTokens: estimateTokens(extractContent(item, 'mindmap')),
    })),
    ...context.templates.map((item, idx) => ({
      data: item,
      type: 'template',
      index: idx,
      priority: calculatePriority(item, 'template'),
      content: extractContent(item, 'template'),
      estimatedTokens: estimateTokens(extractContent(item, 'template')),
    })),
  ];

  // Sort by priority (high to low)
  allItems.sort((a, b) => b.priority - a.priority);

  // Build result arrays
  const result: ContextArrays = {
    textContext: [],
    youtubeTranscripts: [],
    voiceTranscripts: [],
    pdfDocuments: [],
    images: [],
    webpages: [],
    instagramReels: [],
    linkedInPosts: [],
    mindMaps: [],
    templates: [],
  };

  let truncatedCount = 0;
  let droppedCount = 0;

  // Reserve ~5K tokens for XML structure overhead
  const STRUCTURE_OVERHEAD = 5000;
  budget.allocate(STRUCTURE_OVERHEAD);

  // Add items in priority order until budget exhausted
  for (const item of allItems) {
    const maxItemTokens = 30000; // Increased to 30K tokens per item - allows full transcripts

    if (!budget.hasSpace) {
      droppedCount++;
      continue;
    }

    // Check if item fits
    if (item.estimatedTokens <= budget.remaining) {
      // Fits completely
      budget.allocate(item.estimatedTokens);
      addToResult(result, item.type, item.data);
    } else if (budget.remaining > 1000) {
      // Truncate to fit remaining space (only if we have room)
      const availableTokens = Math.min(budget.availableFor(maxItemTokens), budget.remaining);
      if (availableTokens >= 2000) {
        // Only truncate if we can keep at least 2K tokens (meaningful content)
        const truncatedData = truncateItem(item.data, item.type, availableTokens);
        budget.allocate(availableTokens);
        addToResult(result, item.type, truncatedData);
        truncatedCount++;
      } else {
        // Not enough space for meaningful content
        droppedCount++;
      }
    } else {
      // Not enough space even for truncated version
      droppedCount++;
    }
  }

  const budgetStats = budget.getStats();

  return {
    filtered: result,
    stats: {
      originalCount: allItems.length,
      filteredCount: allItems.length - droppedCount,
      estimatedTokens: budgetStats.used,
      budget: maxTokens,
      truncatedItems: truncatedCount,
      droppedItems: droppedCount,
    },
  };
}

function addToResult(result: ContextArrays, type: string, data: any) {
  switch (type) {
    case 'text':
      result.textContext.push(data);
      break;
    case 'youtube':
      result.youtubeTranscripts.push(data);
      break;
    case 'voice':
      result.voiceTranscripts.push(data);
      break;
    case 'pdf':
      result.pdfDocuments.push(data);
      break;
    case 'image':
      result.images.push(data);
      break;
    case 'webpage':
      result.webpages.push(data);
      break;
    case 'instagram':
      result.instagramReels.push(data);
      break;
    case 'linkedin':
      result.linkedInPosts.push(data);
      break;
    case 'mindmap':
      result.mindMaps.push(data);
      break;
    case 'template':
      result.templates.push(data);
      break;
  }
}
