import type {
  Workflow,
  WorkflowNode,
  TextNodeData,
  VoiceNodeData,
  YouTubeNodeData,
  InstagramNodeData,
  LinkedInNodeData,
  LinkedInCreatorNodeData,
  PDFNodeData,
  ImageNodeData,
  ImageGenerationNodeData,
  WebpageNodeData,
  MindMapNodeData,
  TemplateNodeData,
  ChatNodeData
} from '@/types/workflow';

// Metadata shared across all context items
export interface ContextMetadata {
  nodeLabel?: string;        // User-defined label for the node
  nodeDescription?: string;  // User-defined description
  groupName?: string;        // Name of parent group (if in a group)
  groupPath?: string;        // Full group hierarchy (e.g., "Research > Marketing > Q4")
  nodeId?: string;           // Node ID for reference
  lastEditedAt?: string;     // When content was last modified
}

export interface ChatContext {
  textContext: Array<{
    content: string;
    aiInstructions?: string;
    metadata?: ContextMetadata;
  }>;
  youtubeTranscripts: Array<{
    url: string;
    title?: string;           // Video title
    channelName?: string;     // Channel name
    transcript?: string;
    status: 'loading' | 'success' | 'unavailable' | 'error';
    method?: string;
    duration?: string;        // Video duration
    aiInstructions?: string;
    metadata?: ContextMetadata;
  }>;
  voiceTranscripts: Array<{
    audioUrl?: string;
    transcript?: string;
    duration?: number;
    status: 'idle' | 'transcribing' | 'success' | 'error';
    aiInstructions?: string;
    metadata?: ContextMetadata;
  }>;
  pdfDocuments: Array<{
    fileName?: string;
    parsedText?: string;
    pageCount?: number;
    segments?: Array<{
      content: string;
      heading?: string;
      page?: number;
    }>;
    status: 'idle' | 'parsing' | 'success' | 'error';
    aiInstructions?: string;
    metadata?: ContextMetadata;
  }>;
  images: Array<{
    imageUrl?: string;
    caption?: string;
    ocrText?: string;
    description?: string;
    tags?: string[];
    status: 'idle' | 'analyzing' | 'success' | 'error';
    aiInstructions?: string;
    metadata?: ContextMetadata;
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
    contextMetadata?: ContextMetadata;
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
    metadata?: ContextMetadata;
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
    metadata?: ContextMetadata;
  }>;
  mindMaps: Array<{
    concept: string;
    notes?: string;
    tags?: string[];
    aiInstructions?: string;
    metadata?: ContextMetadata;
  }>;
  templates: Array<{
    templateType: string;
    generatedContent?: string;
    status: 'idle' | 'generating' | 'success' | 'error';
    aiInstructions?: string;
    metadata?: ContextMetadata;
  }>;
  generatedImages: Array<{
    prompt?: string;
    imageUrl?: string;
    aspectRatio?: string;
    status: 'idle' | 'generating' | 'success' | 'error';
    aiInstructions?: string;
    metadata?: ContextMetadata;
  }>;
}

/**
 * Safely extract AI instructions from node data
 * Increased limit from 500 to 2000 chars based on 2025 best practices
 */
function safeGetInstructions(data: any): string | undefined {
  if (!data?.aiInstructions) return undefined;

  const trimmed = String(data.aiInstructions).trim();
  if (!trimmed) return undefined;

  // Increased limit for more detailed instructions
  const MAX_LENGTH = 2000;
  if (trimmed.length > MAX_LENGTH) {
    console.warn(`AI instructions truncated from ${trimmed.length} to ${MAX_LENGTH} chars`);
    return trimmed.slice(0, MAX_LENGTH) + '... [truncated]';
  }

  return trimmed;
}

/**
 * Build metadata for a node including label, group hierarchy, and timestamps
 */
function buildNodeMetadata(
  node: WorkflowNode,
  workflow: Workflow
): ContextMetadata {
  const metadata: ContextMetadata = {
    nodeId: node.id,
  };

  // Extract label and description from node data
  if (node.data) {
    const data = node.data as any;
    if (data.label) metadata.nodeLabel = data.label;
    if (data.description) metadata.nodeDescription = data.description;
    if (data.lastEditedAt) metadata.lastEditedAt = data.lastEditedAt;
  }

  // Build group hierarchy if node is in a group
  if (node.parentId) {
    const groupPath: string[] = [];
    let currentParentId = node.parentId;

    // Traverse up the group hierarchy
    while (currentParentId) {
      const parentNode = workflow.nodes.find(n => n.id === currentParentId);
      if (!parentNode) break;

      if (parentNode.type === 'group') {
        const groupData = parentNode.data as any;
        const groupTitle = groupData?.title || 'Untitled Group';
        groupPath.unshift(groupTitle); // Add to beginning to maintain order

        // Set the immediate parent group name
        if (!metadata.groupName) {
          metadata.groupName = groupTitle;
        }
      }

      // Check if parent has a parent (nested groups)
      currentParentId = parentNode.parentId || '';
    }

    // Build full path (e.g., "Research > Marketing > Q4 Analysis")
    if (groupPath.length > 0) {
      metadata.groupPath = groupPath.join(' > ');
    }
  }

  return metadata;
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
    generatedImages: [],
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
        if (textData.plainText && textData.plainText.trim()) {
          context.textContext.push({
            content: textData.plainText,
            aiInstructions: safeGetInstructions(textData),
            metadata: buildNodeMetadata(node, workflow),
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
              metadata: buildNodeMetadata(node, workflow),
            });
          }

          // Add selected video transcripts
          const selectedVideos = youtubeData.channelVideos.filter(v => v.selected);
          selectedVideos.forEach(video => {
            if (video.transcript) {
              context.youtubeTranscripts.push({
                url: `https://www.youtube.com/watch?v=${video.id}`,
                title: video.title,
                channelName: youtubeData.channelTitle,
                transcript: video.transcript,
                status: video.transcriptStatus || 'success',
                method: 'channel',
                duration: video.duration,
                aiInstructions: safeGetInstructions(youtubeData),
                metadata: buildNodeMetadata(node, workflow),
              });
            }
          });
        }
        // Handle single video mode
        else if (youtubeData.url) {
          context.youtubeTranscripts.push({
            url: youtubeData.url,
            title: youtubeData.title,
            channelName: youtubeData.channelTitle,
            transcript: youtubeData.transcript,
            status: youtubeData.transcriptStatus || 'loading',
            method: youtubeData.transcriptMethod,
            duration: youtubeData.duration,
            aiInstructions: safeGetInstructions(youtubeData),
            metadata: buildNodeMetadata(node, workflow),
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
          metadata: buildNodeMetadata(node, workflow),
        });
        break;
      }

      case 'pdf': {
        const pdfData = node.data as PDFNodeData;
        context.pdfDocuments.push({
          fileName: pdfData.fileName,
          parsedText: pdfData.parsedText,
          pageCount: pdfData.pageCount,
          segments: pdfData.segments,
          status: pdfData.parseStatus || 'idle',
          aiInstructions: safeGetInstructions(pdfData),
          metadata: buildNodeMetadata(node, workflow),
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
          metadata: buildNodeMetadata(node, workflow),
        });
        break;
      }

      case 'image-generation': {
        const imageGenData = node.data as ImageGenerationNodeData;
        context.generatedImages.push({
          prompt: imageGenData.prompt,
          imageUrl: imageGenData.generatedImageUrl,
          aspectRatio: imageGenData.aspectRatio,
          status: imageGenData.generationStatus || 'idle',
          aiInstructions: safeGetInstructions(imageGenData),
          metadata: buildNodeMetadata(node, workflow),
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
          contextMetadata: buildNodeMetadata(node, workflow),
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
            metadata: buildNodeMetadata(node, workflow),
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
            metadata: buildNodeMetadata(node, workflow),
          });
        }
        break;
      }

      case 'linkedin-creator': {
        const creatorData = node.data as LinkedInCreatorNodeData;
        // Include generated posts as reference content
        if (creatorData.generatedPost && creatorData.generationStatus === 'success') {
          context.linkedInPosts.push({
            url: '',
            content: creatorData.generatedPostPlainText || creatorData.generatedPost,
            status: 'success',
            summary: `Generated LinkedIn post (${creatorData.characterCount || 0} chars)`,
            postType: 'Generated',
            aiInstructions: safeGetInstructions(creatorData),
            metadata: buildNodeMetadata(node, workflow),
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
          metadata: buildNodeMetadata(node, workflow),
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
          metadata: buildNodeMetadata(node, workflow),
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
      return data.plainText || null;
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
