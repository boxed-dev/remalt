import type {
  Workflow,
  WorkflowNode,
  TextNodeData,
  VoiceNodeData,
  YouTubeNodeData,
  InstagramNodeData,
  LinkedInNodeData,
  PDFNodeData,
  ImageNodeData,
  WebpageNodeData,
  MindMapNodeData,
  TemplateNodeData,
  ChatNodeData
} from '@/types/workflow';

export interface ChatContext {
  textContext: Array<{
    content: string;
    aiInstructions?: string;
  }>;
  youtubeTranscripts: Array<{
    url: string;
    transcript?: string;
    status: 'loading' | 'success' | 'unavailable' | 'error';
    method?: string;
    aiInstructions?: string;
  }>;
  voiceTranscripts: Array<{
    audioUrl?: string;
    transcript?: string;
    duration?: number;
    status: 'idle' | 'transcribing' | 'success' | 'error';
    aiInstructions?: string;
  }>;
  pdfDocuments: Array<{
    fileName?: string;
    parsedText?: string;
    segments?: Array<{
      content: string;
      heading?: string;
      page?: number;
    }>;
    status: 'idle' | 'parsing' | 'success' | 'error';
    aiInstructions?: string;
  }>;
  images: Array<{
    imageUrl?: string;
    caption?: string;
    ocrText?: string;
    description?: string;
    tags?: string[];
    status: 'idle' | 'analyzing' | 'success' | 'error';
    aiInstructions?: string;
  }>;
  webpages: Array<{
    url: string;
    pageTitle?: string;
    pageContent?: string;
    metadata?: {
      description?: string;
      keywords?: string[];
      author?: string;
    };
    status: 'idle' | 'scraping' | 'success' | 'error';
    aiInstructions?: string;
  }>;
  instagramReels: Array<{
    url: string;
    reelCode?: string;
    caption?: string;
    author?: {
      username?: string;
      fullName?: string;
    };
    likes?: number;
    views?: number;
    comments?: number;
    status: 'idle' | 'loading' | 'success' | 'error';
    transcript?: string;
    ocrText?: string;
    summary?: string;
    fullAnalysis?: string;
    isVideo?: boolean;
    postType?: string;
    aiInstructions?: string;
  }>;
  linkedInPosts: Array<{
    url: string;
    postId?: string;
    content?: string;
    author?: {
      name?: string;
      headline?: string;
    };
    reactions?: number;
    comments?: number;
    reposts?: number;
    status: 'idle' | 'loading' | 'success' | 'error';
    summary?: string;
    keyPoints?: string[];
    ocrText?: string;
    fullAnalysis?: string;
    postType?: string;
    aiInstructions?: string;
  }>;
  mindMaps: Array<{
    concept: string;
    notes?: string;
    tags?: string[];
    aiInstructions?: string;
  }>;
  templates: Array<{
    templateType: string;
    generatedContent?: string;
    status: 'idle' | 'generating' | 'success' | 'error';
    aiInstructions?: string;
  }>;
}

/**
 * Safely extract AI instructions from node data
 */
function safeGetInstructions(data: any): string | undefined {
  if (!data?.aiInstructions) return undefined;

  const trimmed = String(data.aiInstructions).trim();
  if (!trimmed) return undefined;

  // Truncate if too long (failsafe)
  return trimmed.slice(0, 500);
}

/**
 * Convert BlockNote JSON format to plain text
 */
function blockNoteToPlainText(content: string | undefined): string {
  if (!content) return '';

  try {
    const blocks = JSON.parse(content);
    if (!Array.isArray(blocks)) return content;

    return blocks
      .map((block: any) => {
        if (block.content && Array.isArray(block.content)) {
          return block.content
            .map((item: any) => item.text || '')
            .join('');
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  } catch {
    // If not JSON, return as-is (backward compatibility)
    return content;
  }
}

/**
 * Build context for a chat node from its linked nodes
 */
export function buildChatContext(
  chatNodeId: string,
  workflow: Workflow
): ChatContext {
  const context: ChatContext = {
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

  if (!workflow) return context;

  // Find all edges that connect to this chat node (incoming edges)
  const incomingEdges = workflow.edges.filter(
    (edge) => edge.target === chatNodeId
  );

  // Get the source nodes
  const sourceNodeIds = incomingEdges.map((edge) => edge.source);
  
  // Collect all nodes to process: direct sources + their children if they're groups
  const nodesToProcess: WorkflowNode[] = [];
  const processedIds = new Set<string>();
  
  sourceNodeIds.forEach((sourceId) => {
    const sourceNode = workflow.nodes.find((n) => n.id === sourceId);
    if (!sourceNode || processedIds.has(sourceId)) return;
    
    nodesToProcess.push(sourceNode);
    processedIds.add(sourceId);
    
    // If it's a group, also include all its children
    if (sourceNode.type === 'group') {
      const children = workflow.nodes.filter((n) => n.parentId === sourceId);
      children.forEach((child) => {
        if (!processedIds.has(child.id)) {
          nodesToProcess.push(child);
          processedIds.add(child.id);
        }
      });
    }
  });

  // Extract context from each source node
  nodesToProcess.forEach((node) => {
    // Skip group nodes themselves (they don't have content)
    if (node.type === 'group') {
      return;
    }
    
    switch (node.type) {
      case 'text': {
        const textData = node.data as TextNodeData;
        const plainText = blockNoteToPlainText(textData.content);
        if (plainText && plainText.trim()) {
          context.textContext.push({
            content: plainText,
            aiInstructions: safeGetInstructions(textData),
          });
        }
        break;
      }

      case 'youtube': {
        const youtubeData = node.data as YouTubeNodeData;

        // Handle channel mode - include all selected videos
        if (youtubeData.mode === 'channel' && youtubeData.channelVideos) {
          // Add channel metadata to text context
          if (youtubeData.channelTitle) {
            const channelInfo = [
              `YouTube Channel: ${youtubeData.channelTitle}`,
              youtubeData.channelCustomUrl ? `Handle: ${youtubeData.channelCustomUrl}` : '',
              youtubeData.channelSubscriberCount ? `Subscribers: ${parseInt(youtubeData.channelSubscriberCount).toLocaleString()}` : '',
              youtubeData.channelVideoCount ? `Total Videos: ${youtubeData.channelVideoCount}` : '',
              youtubeData.channelDescription ? `\nDescription:\n${youtubeData.channelDescription}` : '',
            ].filter(Boolean).join('\n');

            context.textContext.push({
              content: channelInfo,
              aiInstructions: safeGetInstructions(youtubeData),
            });
          }

          // Add selected video transcripts
          const selectedVideos = youtubeData.channelVideos.filter(v => v.selected);
          selectedVideos.forEach(video => {
            if (video.transcript) {
              context.youtubeTranscripts.push({
                url: `https://www.youtube.com/watch?v=${video.id}`,
                transcript: video.transcript,
                status: video.transcriptStatus || 'success',
                method: 'channel',
                aiInstructions: safeGetInstructions(youtubeData),
              });
            }
          });
        }
        // Handle single video mode
        else if (youtubeData.url) {
          context.youtubeTranscripts.push({
            url: youtubeData.url,
            transcript: youtubeData.transcript,
            status: youtubeData.transcriptStatus || 'loading',
            method: youtubeData.transcriptMethod,
            aiInstructions: safeGetInstructions(youtubeData),
          });
        }
        break;
      }

      case 'voice': {
        const voiceData = node.data as VoiceNodeData;
        context.voiceTranscripts.push({
          audioUrl: voiceData.audioUrl,
          transcript: voiceData.transcript,
          duration: voiceData.duration,
          status: voiceData.transcriptStatus || 'idle',
          aiInstructions: safeGetInstructions(voiceData),
        });
        break;
      }

      case 'pdf': {
        const pdfData = node.data as PDFNodeData;
        context.pdfDocuments.push({
          fileName: pdfData.fileName,
          parsedText: pdfData.parsedText,
          segments: pdfData.segments,
          status: pdfData.parseStatus || 'idle',
          aiInstructions: safeGetInstructions(pdfData),
        });
        break;
      }

      case 'image': {
        const imageData = node.data as ImageNodeData;
        context.images.push({
          imageUrl: imageData.imageUrl,
          caption: imageData.caption,
          ocrText: imageData.ocrText,
          description: imageData.analysisData?.description,
          tags: imageData.analysisData?.tags,
          status: imageData.analysisStatus || 'idle',
          aiInstructions: safeGetInstructions(imageData),
        });
        break;
      }

      case 'webpage': {
        const webpageData = node.data as WebpageNodeData;
        context.webpages.push({
          url: webpageData.url,
          pageTitle: webpageData.pageTitle,
          pageContent: webpageData.pageContent,
          metadata: webpageData.metadata,
          status: webpageData.scrapeStatus || 'idle',
          aiInstructions: safeGetInstructions(webpageData),
        });
        break;
      }

      case 'instagram': {
        const instagramData = node.data as InstagramNodeData;
        if (instagramData.url) {
          context.instagramReels.push({
            url: instagramData.url,
            reelCode: instagramData.reelCode,
            caption: instagramData.caption,
            author: instagramData.author,
            likes: instagramData.likes,
            views: instagramData.views,
            comments: instagramData.comments,
            status: instagramData.fetchStatus || 'idle',
            transcript: instagramData.transcript,
            ocrText: instagramData.ocrText,
            summary: instagramData.summary,
            fullAnalysis: instagramData.fullAnalysis,
            isVideo: instagramData.isVideo,
            postType: instagramData.postType,
            aiInstructions: safeGetInstructions(instagramData),
          });
        }
        break;
      }

      case 'linkedin': {
        const linkedInData = node.data as LinkedInNodeData;
        if (linkedInData.url) {
          context.linkedInPosts.push({
            url: linkedInData.url,
            postId: linkedInData.postId,
            content: linkedInData.content,
            author: linkedInData.author,
            reactions: linkedInData.reactions,
            comments: linkedInData.comments,
            reposts: linkedInData.reposts,
            status: linkedInData.fetchStatus || 'idle',
            summary: linkedInData.summary,
            keyPoints: linkedInData.keyPoints,
            ocrText: linkedInData.ocrText,
            fullAnalysis: linkedInData.fullAnalysis,
            postType: linkedInData.postType,
            aiInstructions: safeGetInstructions(linkedInData),
          });
        }
        break;
      }

      case 'mindmap': {
        const mindMapData = node.data as MindMapNodeData;
        context.mindMaps.push({
          concept: mindMapData.concept,
          notes: mindMapData.notes,
          tags: mindMapData.tags,
          aiInstructions: safeGetInstructions(mindMapData),
        });
        break;
      }

      case 'template': {
        const templateData = node.data as TemplateNodeData;
        context.templates.push({
          templateType: templateData.templateType,
          generatedContent: templateData.generatedContent,
          status: templateData.generationStatus || 'idle',
          aiInstructions: safeGetInstructions(templateData),
        });
        break;
      }

      case 'chat': {
        const chatData = node.data as ChatNodeData;
        // Include other chat conversations as context
        if (chatData.messages && chatData.messages.length > 0) {
          const chatHistory = chatData.messages
            .map(msg => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`)
            .join('\n');
          context.textContext.push(`Previous conversation:\n${chatHistory}`);
        }
        break;
      }

      // Connector nodes don't provide direct context
      case 'connector':
      default:
        break;
    }
  });

  return context;
}

/**
 * Helper function to extract text content from any node type
 */
function extractNodeContext(node: WorkflowNode): string | null {
  switch (node.type) {
    case 'text': {
      const data = node.data as TextNodeData;
      const plainText = blockNoteToPlainText(data.content);
      return plainText?.trim() || null;
    }
    case 'youtube': {
      const data = node.data as YouTubeNodeData;
      // Handle channel mode - combine channel info and selected video transcripts
      if (data.mode === 'channel' && data.channelVideos) {
        const parts: string[] = [];

        // Add channel metadata
        if (data.channelTitle) {
          const channelInfo = [
            `YouTube Channel: ${data.channelTitle}`,
            data.channelCustomUrl ? `Handle: ${data.channelCustomUrl}` : '',
            data.channelSubscriberCount ? `Subscribers: ${parseInt(data.channelSubscriberCount).toLocaleString()}` : '',
            data.channelVideoCount ? `Total Videos: ${data.channelVideoCount}` : '',
            data.channelDescription ? `\nDescription:\n${data.channelDescription}` : '',
          ].filter(Boolean).join('\n');
          parts.push(channelInfo);
        }

        // Add selected video transcripts
        const selectedVideos = data.channelVideos.filter(v => v.selected && v.transcript);
        if (selectedVideos.length > 0) {
          const transcripts = selectedVideos
            .map(v => `[Video: ${v.title}]\n${v.transcript}`)
            .join('\n\n---\n\n');
          parts.push(transcripts);
        }

        return parts.length > 0 ? parts.join('\n\n---\n\n') : null;
      }
      // Handle single video mode
      return data.transcript || null;
    }
    case 'voice': {
      const data = node.data as VoiceNodeData;
      return data.transcript || null;
    }
    case 'pdf': {
      const data = node.data as PDFNodeData;
      if (data.parsedText) return data.parsedText;
      if (data.segments) {
        return data.segments.map(s => s.content).join('\n\n');
      }
      return null;
    }
    case 'image': {
      const data = node.data as ImageNodeData;
      const parts = [];
      if (data.caption) parts.push(`Caption: ${data.caption}`);
      if (data.ocrText) parts.push(`Text from image: ${data.ocrText}`);
      if (data.analysisData?.description) parts.push(`Description: ${data.analysisData.description}`);
      return parts.length > 0 ? parts.join('\n') : null;
    }
    case 'webpage': {
      const data = node.data as WebpageNodeData;
      return data.pageContent || null;
    }
    case 'instagram': {
      const data = node.data as InstagramNodeData;
      const parts = [];

      // Add post type and author
      const postLabel = data.isVideo ? 'Instagram Reel' : 'Instagram Post';
      if (data.author?.username) {
        parts.push(`${postLabel} by @${data.author.username}`);
      } else {
        parts.push(postLabel);
      }

      // Add caption if available
      if (data.caption) {
        parts.push(`\nCaption:\n${data.caption}`);
      }

      // If we have full Gemini analysis (for both videos and images), use that - it's much more detailed
      if (data.fullAnalysis) {
        const analysisLabel = data.isVideo ? 'Detailed Video Analysis' : 'Detailed Image Analysis';
        parts.push(`\n--- ${analysisLabel} ---\n${data.fullAnalysis}`);
      } else {
        // Fallback to individual fields
        if (data.transcript) {
          parts.push(`\nVideo Transcript:\n${data.transcript}`);
        }
        if (data.ocrText) {
          parts.push(`\nText from Image:\n${data.ocrText}`);
        }
        if (data.summary) {
          parts.push(`\nSummary:\n${data.summary}`);
        }
      }

      // Add engagement metrics
      const metrics = [];
      if (data.likes !== undefined) metrics.push(`Likes: ${data.likes.toLocaleString()}`);
      if (data.views !== undefined) metrics.push(`Views: ${data.views.toLocaleString()}`);
      if (data.comments !== undefined) metrics.push(`Comments: ${data.comments.toLocaleString()}`);
      if (metrics.length > 0) {
        parts.push(`\nEngagement: ${metrics.join(' • ')}`);
      }

      return parts.length > 0 ? parts.join('\n') : null;
    }
    case 'linkedin': {
      const data = node.data as LinkedInNodeData;
      const parts = [];

      // Add post type and author
      const postLabel = data.postType || 'LinkedIn Post';
      if (data.author?.name) {
        parts.push(`${postLabel} by ${data.author.name}`);
        if (data.author.headline) {
          parts.push(`  ${data.author.headline}`);
        }
      } else {
        parts.push(postLabel);
      }

      // Add post content
      if (data.content) {
        parts.push(`\nPost Content:\n${data.content}`);
      }

      // If we have full analysis, use that - it's much more detailed
      if (data.fullAnalysis) {
        parts.push(`\n--- Detailed Post Analysis ---\n${data.fullAnalysis}`);
      } else {
        // Fallback to individual fields
        if (data.summary) {
          parts.push(`\nSummary:\n${data.summary}`);
        }
        if (data.keyPoints && data.keyPoints.length > 0) {
          parts.push(`\nKey Points:\n${data.keyPoints.map(p => `• ${p}`).join('\n')}`);
        }
        if (data.ocrText) {
          parts.push(`\nText from Image:\n${data.ocrText}`);
        }
      }

      // Add engagement metrics
      const metrics = [];
      if (data.reactions !== undefined) metrics.push(`Reactions: ${data.reactions.toLocaleString()}`);
      if (data.comments !== undefined) metrics.push(`Comments: ${data.comments.toLocaleString()}`);
      if (data.reposts !== undefined) metrics.push(`Reposts: ${data.reposts.toLocaleString()}`);
      if (metrics.length > 0) {
        parts.push(`\nEngagement: ${metrics.join(' • ')}`);
      }

      return parts.length > 0 ? parts.join('\n') : null;
    }
    case 'mindmap': {
      const data = node.data as MindMapNodeData;
      const parts = [`Concept: ${data.concept}`];
      if (data.notes) parts.push(`Notes: ${data.notes}`);
      if (data.tags?.length) parts.push(`Tags: ${data.tags.join(', ')}`);
      return parts.join('\n');
    }
    case 'template': {
      const data = node.data as TemplateNodeData;
      return data.generatedContent || null;
    }
    default:
      return null;
  }
}

/**
 * Get a list of node IDs that are providing context to a chat node
 */
export function getLinkedNodeIds(
  chatNodeId: string,
  workflow: Workflow
): string[] {
  if (!workflow) return [];

  const incomingEdges = workflow.edges.filter(
    (edge) => edge.target === chatNodeId
  );

  return incomingEdges.map((edge) => edge.source);
}

/**
 * Update the linkedNodes field in chat node data
 */
export function updateChatLinkedNodes(
  chatNodeId: string,
  workflow: Workflow
): string[] {
  return getLinkedNodeIds(chatNodeId, workflow);
}
