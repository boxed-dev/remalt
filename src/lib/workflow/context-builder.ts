import type {
  Workflow,
  WorkflowNode,
  TextNodeData,
  VoiceNodeData,
  YouTubeNodeData,
  PDFNodeData,
  ImageNodeData,
  WebpageNodeData,
  MindMapNodeData,
  TemplateNodeData,
  ChatNodeData,
  GroupNodeData
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
  groupChats: Array<{
    groupedNodesCount: number;
    messages?: string[];
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
    mindMaps: [],
    templates: [],
    groupChats: [],
  };

  if (!workflow) return context;

  // Find all edges that connect to this chat node (incoming edges)
  const incomingEdges = workflow.edges.filter(
    (edge) => edge.target === chatNodeId
  );

  // Get the source nodes
  const sourceNodeIds = incomingEdges.map((edge) => edge.source);
  const sourceNodes = workflow.nodes.filter((node) =>
    sourceNodeIds.includes(node.id)
  );

  // Extract context from each source node
  sourceNodes.forEach((node) => {
    switch (node.type) {
      case 'text': {
        const textData = node.data as TextNodeData;
        if (textData.content && textData.content.trim()) {
          context.textContext.push({
            content: textData.content,
            aiInstructions: safeGetInstructions(textData),
          });
        }
        break;
      }

      case 'youtube': {
        const youtubeData = node.data as YouTubeNodeData;
        if (youtubeData.url) {
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

      case 'group': {
        const groupData = node.data as GroupNodeData;
        if (groupData.groupChatEnabled && groupData.groupChatMessages) {
          const groupMessages = groupData.groupChatMessages
            .map(msg => msg.content)
            .filter(Boolean);
          context.groupChats.push({
            groupedNodesCount: groupData.groupedNodes?.length || 0,
            messages: groupMessages,
            aiInstructions: safeGetInstructions(groupData),
          });
        }

        // Also collect context from all grouped nodes
        if (groupData.groupedNodes && groupData.groupedNodes.length > 0) {
          const groupedNodes = workflow.nodes.filter(n =>
            groupData.groupedNodes.includes(n.id)
          );

          // Recursively process grouped nodes
          groupedNodes.forEach(groupedNode => {
            const nodeContext = extractNodeContext(groupedNode);
            if (nodeContext) {
              context.textContext.push(nodeContext);
            }
          });
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
      return data.content?.trim() || null;
    }
    case 'youtube': {
      const data = node.data as YouTubeNodeData;
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
