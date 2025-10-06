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

// Text Node
export interface TextNodeData extends BaseNodeData {
  content: string;
  contentType: 'plain' | 'markdown' | 'html';
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  alignment?: 'left' | 'center' | 'right';
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

// Group Node (for grouping and batch operations)
export interface GroupNodeData extends BaseNodeData {
  groupedNodes: string[]; // IDs of nodes in this group
  groupColor?: string;
  collapsed?: boolean;
  groupChatEnabled?: boolean;
  groupChatMessages?: ChatMessage[];
}

// Union type for all node data
export type NodeData =
  | PDFNodeData
  | VoiceNodeData
  | YouTubeNodeData
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
