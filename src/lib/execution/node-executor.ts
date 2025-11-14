import type {
  Workflow,
  WorkflowNode,
  TextNodeData,
  PDFNodeData,
  VoiceNodeData,
  YouTubeNodeData,
  InstagramNodeData,
  LinkedInNodeData,
  LinkedInCreatorNodeData,
  ImageNodeData,
  ImageGenerationNodeData,
  MindMapNodeData,
  TemplateNodeData,
  WebpageNodeData,
  ChatNodeData,
  StickyNoteData,
  PromptNodeData,
  ChatMessage,
} from '@/types/workflow';
import { buildChatContext } from '@/lib/workflow/context-builder';

/**
 * NodeExecutor - Orchestrates execution of individual nodes
 *
 * This class handles:
 * - Executing nodes based on their type
 * - Building context from connected nodes
 * - Calling appropriate API endpoints
 * - Managing execution state and errors
 * - Returning structured results
 */
export class NodeExecutor {
  /**
   * Execute a single node and return the result
   */
  async executeNode(
    nodeId: string,
    workflow: Workflow,
    options?: ExecutionOptions
  ): Promise<NodeExecutionResult> {
    const node = workflow.nodes.find((n) => n.id === nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found in workflow`);
    }

    // Skip disabled nodes
    if (node.data.disabled) {
      return {
        success: true,
        nodeId,
        nodeType: node.type,
        status: 'bypassed',
        message: 'Node is disabled',
      };
    }

    // Check if output is cached and not stale (unless force execution)
    if (!options?.forceExecution && node.data.output && !node.data.outputStale) {
      return {
        success: true,
        nodeId,
        nodeType: node.type,
        status: 'success',
        output: node.data.output,
        cached: true,
        executionTime: node.data.executionTime,
      };
    }

    const startTime = Date.now();

    try {
      // Execute based on node type
      const output = await this.executeByType(node, workflow, options);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        nodeId,
        nodeType: node.type,
        status: 'success',
        output,
        executionTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      return {
        success: false,
        nodeId,
        nodeType: node.type,
        status: 'error',
        error: {
          message: errorMessage,
          details: error,
          stack: errorStack,
        },
        executionTime,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Execute node based on its type
   */
  private async executeByType(
    node: WorkflowNode,
    workflow: Workflow,
    _options?: ExecutionOptions
  ): Promise<unknown> {
    void _options; // Reserved for future use (retry logic, timeouts, etc.)
    switch (node.type) {
      case 'template':
        return this.executeTemplateNode(node, workflow);

      case 'chat':
        return this.executeChatNode(node, workflow);

      case 'youtube':
        return this.executeYouTubeNode(node);

      case 'voice':
        return this.executeVoiceNode(node);

      case 'instagram':
        return this.executeInstagramNode(node);

      case 'linkedin':
        return this.executeLinkedInNode(node);

      case 'linkedin-creator':
        return this.executeLinkedInCreatorNode(node, workflow);

      case 'pdf':
        return this.executePDFNode(node);

      case 'image':
        return this.executeImageNode(node);

      case 'image-generation':
        return this.executeImageGenerationNode(node, workflow);

      case 'webpage':
        return this.executeWebpageNode(node);

      case 'text':
        return this.executeTextNode(node, workflow);

      case 'mindmap':
        return this.executeMindMapNode(node);

      case 'sticky':
        return this.executeStickyNode(node);

      case 'prompt':
        return this.executePromptNode(node, workflow);

      case 'start':
      case 'connector':
      case 'group':
        // Trigger and structure nodes don't execute - they organize or trigger
        return { message: `${node.type} node - no execution needed` };

      default:
        throw new Error(`Unsupported node type: ${node.type}`);
    }
  }

  /**
   * Execute Template Node
   */
  private async executeTemplateNode(
    node: WorkflowNode,
    workflow: Workflow
  ): Promise<TemplateNodeOutput> {
    const data = node.data as TemplateNodeData;

    // Build context from connected nodes
    const context = buildChatContext(node.id, workflow);

    const response = await fetch('/api/templates/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateType: data.templateType,
        customPrompt: data.customPrompt,
        context,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Template generation failed');
    }

    const result = await response.json();

    return {
      generatedContent: result.content,
      templateType: data.templateType,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Execute Chat Node
   */
  private async executeChatNode(
    node: WorkflowNode,
    _workflow: Workflow
  ): Promise<ChatNodeOutput> {
    void _workflow; // Chat nodes don't need workflow context for status queries
    const data = node.data as ChatNodeData;

    // For chat nodes, we don't auto-execute - they require user interaction
    // Instead, return the current state
    return {
      messages: data.messages || [],
      sessionCount: data.sessions?.length || 0,
      model: data.model,
      note: 'Chat nodes execute on user message send - this is the current state',
    };
  }

  /**
   * Execute YouTube Node
   */
  private async executeYouTubeNode(node: WorkflowNode): Promise<YouTubeNodeOutput> {
    const data = node.data as YouTubeNodeData;

    if (!data.url) {
      throw new Error('YouTube URL is required');
    }

    // If transcript already exists and mode is video, return cached
    if (data.mode === 'video' && data.transcript && data.transcriptStatus === 'success') {
      return {
        videoId: data.videoId!,
        title: data.title!,
        transcript: data.transcript,
        cached: true,
      };
    }

    const response = await fetch('/api/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: data.url }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'YouTube transcription failed');
    }

    const result = await response.json();

    return {
      videoId: result.videoId,
      title: result.title || data.title,
      transcript: result.transcript,
      method: result.method,
    };
  }

  /**
   * Execute Voice Node
   */
  private async executeVoiceNode(node: WorkflowNode): Promise<VoiceNodeOutput> {
    const data = node.data as VoiceNodeData;

    if (!data.audioUrl) {
      throw new Error('Audio URL is required');
    }

    // If transcript already exists, return cached
    if (data.transcript && data.transcriptStatus === 'success') {
      return {
        transcript: data.transcript,
        duration: data.duration,
        cached: true,
      };
    }

    const response = await fetch('/api/voice/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audio: data.audioUrl,
        format: 'mp3', // Default format
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Voice transcription failed');
    }

    const result = await response.json();

    return {
      transcript: result.transcript,
      duration: data.duration,
      confidence: result.confidence,
    };
  }

  /**
   * Execute Instagram Node
   */
  private async executeInstagramNode(node: WorkflowNode): Promise<InstagramNodeOutput> {
    const data = node.data as InstagramNodeData;

    if (!data.url) {
      throw new Error('Instagram URL is required');
    }

    // If already fetched, return cached
    if (data.fetchStatus === 'success' && (data.transcript || data.summary)) {
      return {
        reelCode: data.reelCode!,
        caption: data.caption,
        transcript: data.transcript,
        summary: data.summary,
        cached: true,
      };
    }

    // Fetch reel data
    const response = await fetch('/api/instagram/reel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: data.url }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Instagram fetch failed');
    }

    const result = await response.json();

    return {
      reelCode: result.reelCode,
      caption: result.caption,
      transcript: result.transcript,
      summary: result.summary,
      author: result.author,
      stats: {
        likes: result.likes,
        views: result.views,
        comments: result.comments,
      },
    };
  }

  /**
   * Execute LinkedIn Node
   */
  private async executeLinkedInNode(node: WorkflowNode): Promise<LinkedInNodeOutput> {
    const data = node.data as LinkedInNodeData;

    if (!data.url) {
      throw new Error('LinkedIn URL is required');
    }

    // If already analyzed, return cached
    if (data.analysisStatus === 'success' && data.summary) {
      return {
        postId: data.postId!,
        content: data.content!,
        summary: data.summary,
        keyPoints: data.keyPoints || [],
        cached: true,
      };
    }

    // Fetch post data
    const fetchResponse = await fetch('/api/linkedin/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: data.url }),
    });

    if (!fetchResponse.ok) {
      const error = await fetchResponse.json();
      throw new Error(error.error || 'LinkedIn fetch failed');
    }

    const postData = await fetchResponse.json();

    // Analyze post
    const analyzeResponse = await fetch('/api/linkedin/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: postData.content,
        imageUrl: postData.imageUrl,
      }),
    });

    if (!analyzeResponse.ok) {
      const error = await analyzeResponse.json();
      throw new Error(error.error || 'LinkedIn analysis failed');
    }

    const analysisData = await analyzeResponse.json();

    return {
      postId: postData.postId,
      content: postData.content,
      summary: analysisData.summary,
      keyPoints: analysisData.keyPoints || [],
      author: postData.author,
    };
  }

  /**
   * Execute LinkedIn Creator Node
   */
  private async executeLinkedInCreatorNode(
    node: WorkflowNode,
    workflow: Workflow
  ): Promise<LinkedInCreatorNodeOutput> {
    const data = node.data as LinkedInCreatorNodeData;

    // Determine the topic
    const topic = data.selectedTab === 'your-topic'
      ? data.manualTopic
      : data.selectedSuggestedTopic;

    if (!topic) {
      throw new Error('Topic is required to generate LinkedIn post');
    }

    // Build context from connected nodes
    const context = buildChatContext(node.id, workflow);

    // Call generation API (implementation needed)
    const response = await fetch('/api/linkedin/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic,
        voiceTone: data.voiceTone,
        styleSettings: data.styleSettings,
        context,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'LinkedIn post generation failed');
    }

    const result = await response.json();

    return {
      generatedPost: result.post,
      characterCount: result.characterCount,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Execute PDF Node
   */
  private async executePDFNode(node: WorkflowNode): Promise<PDFNodeOutput> {
    const data = node.data as PDFNodeData;

    if (!data.url && !data.storageUrl) {
      throw new Error('PDF URL is required');
    }

    // If already parsed, return cached
    if (data.parseStatus === 'success' && data.parsedText) {
      return {
        fileName: data.fileName!,
        parsedText: data.parsedText,
        pageCount: data.pageCount,
        segments: data.segments || [],
        cached: true,
      };
    }

    const pdfUrl = data.storageUrl || data.url;

    const response = await fetch('/api/pdf/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdfUrl }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'PDF parsing failed');
    }

    const result = await response.json();

    return {
      fileName: data.fileName || 'document.pdf',
      parsedText: result.parsedText,
      pageCount: result.pageCount,
      segments: result.segments || [],
    };
  }

  /**
   * Execute Image Node
   */
  private async executeImageNode(node: WorkflowNode): Promise<ImageNodeOutput> {
    const data = node.data as ImageNodeData;

    if (!data.imageUrl && !data.storageUrl) {
      throw new Error('Image URL is required');
    }

    // If already analyzed, return cached
    if (data.analysisStatus === 'success' && data.analysisData) {
      return {
        imageUrl: data.storageUrl || data.imageUrl!,
        analysis: data.analysisData,
        ocrText: data.ocrText,
        cached: true,
      };
    }

    const imageUrl = data.storageUrl || data.imageUrl;

    const response = await fetch('/api/image/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Image analysis failed');
    }

    const result = await response.json();

    return {
      imageUrl: imageUrl!,
      analysis: {
        description: result.description,
        tags: result.tags || [],
        colors: result.colors || [],
      },
      ocrText: result.ocrText,
    };
  }

  /**
   * Execute Image Generation Node
   */
  private async executeImageGenerationNode(
    node: WorkflowNode,
    workflow: Workflow
  ): Promise<ImageGenerationNodeOutput> {
    const data = node.data as ImageGenerationNodeData;

    if (!data.prompt) {
      throw new Error('Prompt is required for image generation');
    }

    // Build context to enhance prompt if needed
    const context = buildChatContext(node.id, workflow);

    const response = await fetch('/api/image/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: data.prompt,
        aspectRatio: data.aspectRatio || '1:1',
        context,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Image generation failed');
    }

    const result = await response.json();

    return {
      imageUrl: result.imageUrl,
      imageBase64: result.imageBase64,
      prompt: data.prompt,
      aspectRatio: data.aspectRatio || '1:1',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Execute Webpage Node
   */
  private async executeWebpageNode(node: WorkflowNode): Promise<WebpageNodeOutput> {
    const data = node.data as WebpageNodeData;

    if (!data.url) {
      throw new Error('Webpage URL is required');
    }

    // If already scraped, return cached
    if (data.scrapeStatus === 'success' && data.pageContent) {
      return {
        url: data.url,
        pageTitle: data.pageTitle!,
        pageContent: data.pageContent,
        metadata: data.metadata,
        cached: true,
      };
    }

    const response = await fetch('/api/webpage/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: data.url }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Webpage scraping failed');
    }

    const result = await response.json();

    return {
      url: data.url,
      pageTitle: result.pageTitle,
      pageContent: result.pageContent,
      metadata: result.metadata,
    };
  }

  /**
   * Execute Text Node
   */
  private async executeTextNode(
    node: WorkflowNode,
    workflow: Workflow
  ): Promise<TextNodeOutput> {
    const data = node.data as TextNodeData;

    // If text node has AI instructions, process with context
    if (data.aiInstructions) {
      const context = buildChatContext(node.id, workflow);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `${data.aiInstructions}\n\nCurrent text content:\n${data.plainText || data.content}`,
            },
          ],
          model: 'google/gemini-2.5-flash',
          provider: 'gemini',
          context,
        }),
      });

      if (!response.ok) {
        throw new Error('Text processing failed');
      }

      // Stream response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let processedText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          processedText += decoder.decode(value, { stream: true });
        }
      }

      return {
        content: data.content,
        plainText: data.plainText || '',
        processedText,
        wordCount: data.wordCount || 0,
      };
    }

    // No AI instructions - just return the content
    return {
      content: data.content,
      plainText: data.plainText || '',
      wordCount: data.wordCount || 0,
    };
  }

  /**
   * Execute MindMap Node
   */
  private async executeMindMapNode(node: WorkflowNode): Promise<MindMapNodeOutput> {
    const data = node.data as MindMapNodeData;

    return {
      concept: data.concept,
      notes: data.notes,
      tags: data.tags || [],
      connections: data.connections || [],
    };
  }

  /**
   * Execute Sticky Note Node
   */
  private async executeStickyNode(node: WorkflowNode): Promise<StickyNodeOutput> {
    const data = node.data as StickyNoteData;

    return {
      content: data.content,
      backgroundColor: data.backgroundColor,
      textColor: data.textColor,
      fontSize: data.fontSize,
    };
  }

  /**
   * Execute Prompt Node - AI transformation with custom prompt
   */
  private async executePromptNode(
    node: WorkflowNode,
    workflow: Workflow
  ): Promise<PromptNodeOutput> {
    const data = node.data as PromptNodeData;

    if (!data.prompt) {
      throw new Error('Prompt is required');
    }

    // Build context from connected nodes
    const context = buildChatContext(node.id, workflow);

    console.log('[PromptNode] Executing with context:', context);

    // Use the chat API with the prompt
    // IMPORTANT: Spread context fields at top level (API expects them there, not nested under 'context')
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: data.prompt,
          },
        ],
        model: data.model || 'google/gemini-2.5-flash',
        provider: data.provider || 'gemini',
        temperature: data.temperature || 0.7,
        // Spread context fields at top level
        ...context,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[PromptNode] API Error:', errorText);
      throw new Error(`Prompt execution failed: ${errorText}`);
    }

    // Stream the response - SSE format with JSON chunks
    // Format: "data: {\"content\":\"text\",\"done\":false}\n\n"
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let processedText = '';
    let buffer = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete messages (ending with \n\n)
        const messages = buffer.split('\n\n');
        buffer = messages.pop() || ''; // Keep incomplete message in buffer

        for (const message of messages) {
          if (message.startsWith('data: ')) {
            const jsonStr = message.substring(6); // Remove "data: " prefix
            try {
              const parsed = JSON.parse(jsonStr);
              // Extract content field from JSON
              if (parsed.content) {
                processedText += parsed.content;
              }
            } catch {
              // If parsing fails, just append the raw string
              console.warn('[PromptNode] Failed to parse chunk:', jsonStr);
              processedText += jsonStr;
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer.startsWith('data: ')) {
        const jsonStr = buffer.substring(6);
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.content) {
            processedText += parsed.content;
          }
        } catch {
          processedText += jsonStr;
        }
      }
    }

    console.log('[PromptNode] Final output length:', processedText.length);

    if (!processedText.trim()) {
      throw new Error('No output received from AI model');
    }

    return {
      processedOutput: processedText.trim(),
      prompt: data.prompt,
      model: data.model || 'google/gemini-2.5-flash',
      timestamp: new Date().toISOString(),
    };
  }
}

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface ExecutionOptions {
  forceExecution?: boolean; // Force execution even if output is cached
  stopOnError?: boolean; // Stop workflow execution on first error
  timeout?: number; // Timeout in milliseconds
}

export interface NodeExecutionResult {
  success: boolean;
  nodeId: string;
  nodeType: string;
  status: 'success' | 'error' | 'bypassed';
  output?: unknown;
  error?: {
    message: string;
    details?: unknown;
    stack?: string;
  };
  executionTime?: number; // milliseconds
  timestamp?: string;
  cached?: boolean;
  message?: string;
}

// Output types for each node type

export interface TemplateNodeOutput {
  generatedContent: string;
  templateType: string;
  timestamp: string;
}

export interface ChatNodeOutput {
  messages: ChatMessage[];
  sessionCount: number;
  model: string;
  note: string;
}

export interface YouTubeNodeOutput {
  videoId: string;
  title: string;
  transcript: string;
  method?: string;
  cached?: boolean;
}

export interface VoiceNodeOutput {
  transcript: string;
  duration?: number;
  confidence?: number;
  cached?: boolean;
}

export interface InstagramNodeOutput {
  reelCode: string;
  caption?: string;
  transcript?: string;
  summary?: string;
  author?: {
    username?: string;
    fullName?: string;
  };
  stats?: {
    likes?: number;
    views?: number;
    comments?: number;
  };
  cached?: boolean;
}

export interface LinkedInNodeOutput {
  postId: string;
  content: string;
  summary: string;
  keyPoints: string[];
  author?: {
    name?: string;
    headline?: string;
  };
  cached?: boolean;
}

export interface LinkedInCreatorNodeOutput {
  generatedPost: string;
  characterCount: number;
  timestamp: string;
}

export interface PDFNodeOutput {
  fileName: string;
  parsedText: string;
  pageCount?: number;
  segments: Array<{
    id: string;
    content: string;
    page?: number;
    heading?: string;
  }>;
  cached?: boolean;
}

export interface ImageNodeOutput {
  imageUrl: string;
  analysis: {
    description: string;
    tags: string[];
    colors?: string[];
  };
  ocrText?: string;
  cached?: boolean;
}

export interface ImageGenerationNodeOutput {
  imageUrl?: string;
  imageBase64?: string;
  prompt: string;
  aspectRatio: string;
  timestamp: string;
}

export interface WebpageNodeOutput {
  url: string;
  pageTitle: string;
  pageContent: string;
  metadata?: {
    description?: string;
    keywords?: string[];
    author?: string;
  };
  cached?: boolean;
}

export interface TextNodeOutput {
  content: string;
  plainText: string;
  processedText?: string;
  wordCount: number;
}

export interface MindMapNodeOutput {
  concept: string;
  notes?: string;
  tags: string[];
  connections: string[];
}

export interface StickyNodeOutput {
  content: string;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: 'small' | 'medium' | 'large';
}

export interface PromptNodeOutput {
  processedOutput: string;
  prompt: string;
  model: string;
  timestamp: string;
}
