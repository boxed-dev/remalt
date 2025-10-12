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
  | 'pdf'
  | 'voice'
  | 'image'
  | 'youtube'
  | 'instagram'
  | 'linkedin'
  | 'text'
  | 'mindmap'
  | 'template'
  | 'webpage'
  | 'chat'
  | 'connector'
  | 'group';

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
  parsedText?: string;
  headings?: string[];
  segments?: {
    id: string;
    content: string;
    page?: number;
    heading?: string;
  }[];
  parseStatus?: 'idle' | 'parsing' | 'success' | 'error';
  parseError?: string;
}
// Voice Note Node
export interface VoiceNodeData extends BaseNodeData {
  audioUrl?: string;
  audioStoragePath?: string;
  audioSignedUrlExpiresAt?: string;
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

// Text Node
export interface TextNodeData extends BaseNodeData {
  content: string; // BlockNote JSON format as string
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
  messages: ChatMessage[];
  linkedNodes: string[];
  systemPrompt?: string;
  model: 'gemini-2.5-flash' | 'gemini-2.5-pro';
  temperature?: number;
  maxTokens?: number;
  contextWindow: unknown[];
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

// Union type for all node data
export type NodeData =
  | PDFNodeData
  | VoiceNodeData
  | YouTubeNodeData
  | InstagramNodeData
  | LinkedInNodeData
  | ImageNodeData
  | TextNodeData
  | MindMapNodeData
  | TemplateNodeData
  | WebpageNodeData
  | ChatNodeData
  | ConnectorNodeData
  | GroupNodeData;

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
