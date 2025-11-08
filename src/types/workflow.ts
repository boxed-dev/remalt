// ============================================
// WORKFLOW
// ============================================
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport: Viewport;
  metadata: WorkflowMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowMetadata {
  version: string;
  tags: string[];
  category?: string;
  isPublic: boolean;
  author?: string;
  authorEmail?: string;
  publishedAt?: string;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

// ============================================
// NODES
// ============================================
export type NodeType =
  | 'text'
  | 'pdf'
  | 'voice'
  | 'image'
  | 'youtube'
  | 'instagram'
  | 'linkedin'
  | 'linkedin-creator'
  | 'mindmap'
  | 'template'
  | 'webpage'
  | 'chat'
  | 'connector'
  | 'group'
  | 'sticky';

export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: Position;
  data: NodeData;
  style?: NodeStyle;
  metadata?: NodeMetadata;
  parentId?: string | null;
  zIndex?: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface NodeStyle {
  width?: number;
  height?: number;
  backgroundColor?: string;
  borderColor?: string;
  opacity?: number;
}

export interface NodeMetadata {
  label?: string;
  description?: string;
  color?: string;
  icon?: string;
  collapsed?: boolean;
}

// ============================================
// NODE DATA TYPES
// ============================================

// Base Node Data
export interface BaseNodeData {
  label?: string;
  description?: string;
  disabled?: boolean;
  validationErrors?: string[];
  aiInstructions?: string; // AI processing guidelines for this node
}

// PDF/Document Node
export interface PDFNodeData extends BaseNodeData {
  url?: string;
  file?: File;
  fileName?: string;
  fileSize?: number;
  storagePath?: string; // Path in Supabase storage (e.g., "userId/pdfs/uuid-file.pdf")
  storageUrl?: string; // Public URL from Supabase Storage
  uploadSource?: 'url' | 'storage'; // Track upload source (storage = Supabase Storage)
  pageCount?: number; // Total number of pages
  parsedText?: string;
  headings?: string[];
  segments?: {
    id: string;
    content: string;
    page?: number;
    heading?: string;
  }[];
  parseStatus?: 'idle' | 'uploading' | 'parsing' | 'success' | 'error';
  parseError?: string;
}
// Voice Note Node
export interface VoiceNodeData extends BaseNodeData {
  audioUrl?: string; // Blob URL for local playback or Supabase Storage URL
  storagePath?: string; // Path in Supabase storage (e.g., "userId/audio/uuid-file.mp3")
  storageUrl?: string; // Public URL from Supabase Storage
  uploadSource?: 'recording' | 'storage'; // Track audio source (storage = Supabase Storage)
  uploadStatus?: 'idle' | 'uploading' | 'success' | 'error';
  audioFile?: File;
  duration?: number;
  transcript?: string;
  transcriptStatus?: 'idle' | 'transcribing' | 'success' | 'error';
  transcriptError?: string;
  waveformData?: number[];
  interimTranscript?: string; // Live partial transcript during recording
  finalTranscripts?: string[]; // Array of completed utterances
  isLiveRecording?: boolean; // Flag for active live recording
}

// YouTube Video/Channel Node
export interface YouTubeNodeData extends BaseNodeData {
  // Common fields
  url?: string;
  mode?: 'video' | 'channel'; // Determines if this is a video or channel node

  // Video-specific fields
  videoId?: string;
  title?: string;
  thumbnail?: string;
  transcript?: string;
  transcriptStatus?: 'loading' | 'success' | 'unavailable' | 'error';
  transcriptMethod?: string;
  transcriptError?: string;

  // Channel-specific fields
  channelId?: string;
  channelTitle?: string;
  channelDescription?: string;
  channelThumbnail?: string;
  channelSubscriberCount?: string;
  channelVideoCount?: string;
  channelCustomUrl?: string;

  // Channel videos
  channelVideos?: Array<{
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    publishedAt: string;
    duration: string;
    viewCount: string;
    selected: boolean; // Whether this video is selected for transcript extraction
    transcript?: string;
    transcriptStatus?: 'loading' | 'success' | 'unavailable' | 'error';
  }>;
  channelLoadStatus?: 'idle' | 'loading' | 'success' | 'error';
  channelError?: string;
  nextPageToken?: string;
}

// Image Node
export interface ImageNodeData extends BaseNodeData {
  imageUrl?: string; // URL input or Supabase Storage URL
  imageFile?: File;
  thumbnail?: string;
  caption?: string;
  storagePath?: string; // Path in Supabase storage (e.g., "userId/images/uuid-file.jpg")
  storageUrl?: string; // Public URL from Supabase Storage
  uploadSource?: 'url' | 'storage'; // Track upload source (storage = Supabase Storage)
  ocrText?: string;
  analysisData?: {
    description: string;
    tags: string[];
    colors?: string[];
  };
  analysisStatus?: 'idle' | 'loading' | 'analyzing' | 'success' | 'error';
  analysisError?: string;
}

// Instagram Node
export interface InstagramNodeData extends BaseNodeData {
  url?: string;
  reelCode?: string;
  permalink?: string; // Canonical Instagram permalink
  videoUrl?: string;
  thumbnail?: string;
  thumbnailFallback?: string;
  images?: string[]; // All images for carousel posts (Sidecar type)
  caption?: string;
  author?: {
    username?: string;
    fullName?: string;
    profilePicUrl?: string;
  };
  likes?: number;
  views?: number;
  comments?: number;
  duration?: number;
  // Story-specific metadata
  isStory?: boolean;
  takenAt?: string; // ISO timestamp when story was taken
  expiresAt?: string; // ISO timestamp when story expires
  fetchStatus?: 'idle' | 'loading' | 'success' | 'error';
  fetchError?: string;
  isVideo?: boolean;
  postType?: string; // 'Video', 'Image', 'Sidecar'
  storageStatus?: 'idle' | 'uploading' | 'success' | 'error';
  storedVideoUrl?: string;
  analysisStatus?: 'idle' | 'analyzing' | 'success' | 'error';
  transcript?: string;
  summary?: string;
  fullAnalysis?: string; // Complete Gemini video/image analysis
  ocrText?: string; // Text extracted from image posts
  analysisError?: string;
  // Supabase Storage permanent backup (primary media)
  storagePath?: string; // Storage path for video or primary image
  storageUrl?: string; // Public URL from Supabase Storage for video or primary image
  storageThumbnailPath?: string; // Storage path for thumbnail (for videos)
  storageThumbnailUrl?: string; // Public thumbnail URL from Supabase Storage (for videos)
  storageImagePaths?: string[]; // Storage paths for carousel images
  storageImageUrls?: string[]; // Public URLs from Supabase Storage for carousel images
  backupStatus?: 'idle' | 'backing-up' | 'success' | 'partial' | 'failed'; // Media backup status
  backupError?: string; // Error message if backup fails
  // Original URLs (for fallback/reference)
  originalVideoUrl?: string; // Original Instagram video URL
  originalThumbnail?: string; // Original Instagram thumbnail URL
  originalImages?: string[]; // Original Instagram carousel image URLs
}

// LinkedIn Node
export interface LinkedInNodeData extends BaseNodeData {
  url?: string;
  postId?: string;
  content?: string;
  imageUrl?: string;
  videoUrl?: string;
  author?: {
    name?: string;
    headline?: string;
    profileUrl?: string;
    profilePicUrl?: string;
  };
  reactions?: number;
  comments?: number;
  reposts?: number;
  fetchStatus?: 'idle' | 'loading' | 'success' | 'error';
  fetchError?: string;
  postType?: string; // 'Text', 'Image', 'Video', 'Article', 'Poll'
  analysisStatus?: 'idle' | 'analyzing' | 'success' | 'error';
  summary?: string;
  keyPoints?: string[];
  fullAnalysis?: string; // Complete AI analysis of post
  ocrText?: string; // Text extracted from images
  analysisError?: string;
}

// LinkedIn Post Creator Node
export interface LinkedInCreatorNodeData extends BaseNodeData {
  // Tab selection
  selectedTab?: 'your-topic' | 'suggested-topic';

  // Topic input
  manualTopic?: string;
  selectedSuggestedTopic?: string;
  suggestedTopics?: Array<{
    id: string;
    topic: string;
    source: string; // 'ai' | 'connected-node'
    context?: string;
  }>;

  // File uploads (for topic extraction)
  uploadedFiles?: Array<{
    id: string;
    type: 'image' | 'audio' | 'document';
    url: string;
    storagePath?: string;
    storageUrl?: string;
    fileName?: string;
    extractedTopic?: string;
    extractionStatus?: 'idle' | 'extracting' | 'success' | 'error';
    extractionError?: string;
  }>;

  // Voice tone
  voiceTone?: 'professional' | 'casual' | 'inspirational' | 'thought-leadership' | 'humorous' | 'educational' | 'storytelling';

  // Style configuration
  styleSettings?: {
    format?: 'storytelling' | 'listicle' | 'question-based' | 'personal-story' | 'case-study' | 'how-to';
    length?: 'short' | 'medium' | 'long'; // 300-600, 600-1200, 1200-3000
    targetLength?: number; // Exact character target
    useEmojis?: boolean;
    hashtagCount?: number; // 0-5
    lineBreakStyle?: 'minimal' | 'moderate' | 'generous';
    includeCTA?: boolean;
    ctaType?: 'comment' | 'share' | 'link' | 'dm' | 'custom';
    customCTA?: string;
  };

  // Generated content
  generatedPost?: string;
  generatedPostPlainText?: string;
  generationStatus?: 'idle' | 'generating' | 'success' | 'error';
  generationError?: string;
  generatedAt?: string;

  // Post metadata
  characterCount?: number;

  // Attached media (for the post itself)
  attachedMedia?: Array<{
    id: string;
    type: 'image' | 'document';
    url: string;
    fileName?: string;
  }>;
}

// Mind Map / Idea Node
export interface MindMapNodeData extends BaseNodeData {
  concept: string;
  notes?: string;
  color?: string;
  icon?: string;
  tags?: string[];
  connections?: string[]; // IDs of related nodes
}

// Text / Rich Content Node
export interface TextNodeData extends BaseNodeData {
  content: string; // JSON stringified editor content (TipTap/Novel format)
  plainText?: string; // Plain text version for context
  wordCount?: number;
  lastEditedAt?: string;
}

// Template / Workflow Node (Generated Content)
export interface TemplateNodeData extends BaseNodeData {
  templateType: 'youtube-script' | 'ad-copy' | 'captions' | 'blog-post' | 'custom';
  generatedContent?: string;
  sourceNodes?: string[]; // IDs of nodes used as input
  generationStatus?: 'idle' | 'generating' | 'success' | 'error';
  generationError?: string;
  customPrompt?: string;
}

// Webpage / URL Node
export interface WebpageNodeData extends BaseNodeData {
  url: string;
  pageTitle?: string;
  pageContent?: string;
  metadata?: {
    description?: string;
    keywords?: string[];
    author?: string;
    publishedDate?: string;
  };
  scrapedImages?: string[];
  scrapeStatus?: 'idle' | 'scraping' | 'success' | 'error';
  scrapeError?: string;
}

// Chat / Assistant Node
export interface ChatNodeData extends BaseNodeData {
  // Legacy support for old single-chat format
  messages: ChatMessage[];
  linkedNodes: string[];
  systemPrompt?: string;
  model: string; // Dynamic model support (e.g., 'google/gemini-2.5-flash', 'openai/gpt-4.1')
  provider?: 'gemini' | 'openrouter'; // Provider routing
  temperature?: number;
  maxTokens?: number;
  contextWindow: unknown[];

  // Model metadata for display and tracking
  modelMetadata?: {
    contextWindow?: number;
    pricing?: {
      input: number;
      output: number;
    };
  };

  // New multi-chat session support
  sessions?: ChatSession[];
  currentSessionId?: string;

  // Web search integration
  webSearchEnabled?: boolean; // Enable Tavily web search for this chat
}

export interface ChatSession {
  id: string;
  title: string; // Auto-generated from first message or custom
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  model: string; // Dynamic model support
  provider?: 'gemini' | 'openrouter'; // Provider routing
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    tokensUsed?: number;
    latency?: number;
    contextNodes?: string[];
    webSearchUsed?: boolean; // Whether web search was used for this message
    searchQuery?: string; // The search query used
  };
}

// Connector Node (Relationships / Linking)
export interface ConnectorNodeData extends BaseNodeData {
  relationshipType: 'workflow' | 'reference' | 'dependency' | 'custom';
  fromNode?: string;
  toNode?: string;
  metadata?: Record<string, unknown>;
}

// Group / Container Node
export interface GroupNodeData extends BaseNodeData {
  title?: string;
}

// Sticky Note Node
export interface StickyNoteData extends BaseNodeData {
  content: string; // JSON stringified editor content (TipTap format)
  backgroundColor?: string; // Background color of the sticky note
  textColor?: string; // Text color
  fontSize?: 'small' | 'medium' | 'large';
}

// Union type for all node data
export type NodeData =
  | TextNodeData
  | PDFNodeData
  | VoiceNodeData
  | YouTubeNodeData
  | InstagramNodeData
  | LinkedInNodeData
  | LinkedInCreatorNodeData
  | ImageNodeData
  | MindMapNodeData
  | TemplateNodeData
  | WebpageNodeData
  | ChatNodeData
  | ConnectorNodeData
  | GroupNodeData
  | StickyNoteData;

// ============================================
// EDGES (Connections)
// ============================================
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: EdgeType;
  animated?: boolean;
  style?: EdgeStyle;
  label?: string;
  data?: EdgeData;
}

export type EdgeType = 'default' | 'smoothstep' | 'straight' | 'step';

export interface EdgeStyle {
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
}

export interface EdgeData {
  dataType?: 'text' | 'video' | 'chat' | 'any';
  validated?: boolean;
}

// ============================================
// EXECUTION
// ============================================
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  startTime: string;
  endTime?: string;
  nodeResults: Map<string, NodeResult>;
  errors: ExecutionError[];
  logs: ExecutionLog[];
}

export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface NodeResult {
  nodeId: string;
  status: 'pending' | 'running' | 'success' | 'error';
  output: unknown;
  error?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
}

export interface ExecutionError {
  nodeId: string;
  message: string;
  stack?: string;
  timestamp: string;
}

export interface ExecutionLog {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  nodeId?: string;
}
