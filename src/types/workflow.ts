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
  storagePath?: string; // Path in Supabase storage
  uploadcareCdnUrl?: string; // Uploadcare CDN URL
  uploadcareUuid?: string; // Uploadcare file UUID for transformations
  uploadSource?: 'url' | 'uploadcare' | 'supabase'; // Track upload source
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
  audioUrl?: string;
  audioStoragePath?: string;
  audioSignedUrlExpiresAt?: string;
  uploadcareCdnUrl?: string; // Uploadcare CDN URL for uploaded audio
  uploadcareUuid?: string; // Uploadcare file UUID
  uploadSource?: 'recording' | 'uploadcare' | 'supabase'; // Track audio source
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
  imageUrl?: string;
  imageFile?: File;
  thumbnail?: string;
  caption?: string;
  uploadcareCdnUrl?: string;
  uploadSource?: 'url' | 'uploadcare';
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
  // UploadCare permanent storage (primary media)
  uploadcareCdnUrl?: string; // Permanent UploadCare URL for video or primary image
  uploadcareUuid?: string; // UploadCare file UUID for video or primary image
  uploadcareThumbnailUrl?: string; // Permanent UploadCare thumbnail URL (for videos)
  uploadcareThumbnailUuid?: string; // UploadCare thumbnail UUID (for videos)
  uploadcareImages?: string[]; // Permanent UploadCare URLs for carousel images
  uploadcareImageUuids?: string[]; // UploadCare UUIDs for carousel images
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
  model: 'gemini-2.5-flash' | 'gemini-2.5-pro';
  temperature?: number;
  maxTokens?: number;
  contextWindow: unknown[];

  // New multi-chat session support
  sessions?: ChatSession[];
  currentSessionId?: string;
}

export interface ChatSession {
  id: string;
  title: string; // Auto-generated from first message or custom
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  model: 'gemini-flash-latest' | 'gemini-2.5-flash' | 'gemini-2.5-pro' | 'gemini-2.0-flash-exp';
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
