import { z } from 'zod';

// Base schema for data that can be in any node
const BaseNodeDataSchema = z.object({
  label: z.string().optional(),
  description: z.string().optional(),
  disabled: z.boolean().optional(),
  validationErrors: z.array(z.string()).optional(),
  aiInstructions: z.string().optional(),
});

// Schemas for specific node data types
const PDFSegmentSchema = z.object({
  id: z.string(),
  content: z.string(),
  page: z.number().optional(),
  heading: z.string().optional(),
});

const PDFNodeDataSchema = BaseNodeDataSchema.extend({
  url: z.string().optional(),
  // file is omitted - not serializable
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  parsedText: z.string().optional(),
  headings: z.array(z.string()).optional(),
  segments: z.array(PDFSegmentSchema).optional(),
  parseStatus: z.enum(['idle', 'parsing', 'success', 'error']).optional(),
  parseError: z.string().optional(),
});

const VoiceNodeDataSchema = BaseNodeDataSchema.extend({
  audioUrl: z.string().optional(),
  audioStoragePath: z.string().optional(),
  audioSignedUrlExpiresAt: z.string().optional(),
  uploadStatus: z.enum(['idle', 'uploading', 'success', 'error']).optional(),
  // audioFile is omitted - not serializable
  duration: z.number().optional(),
  transcript: z.string().optional(),
  transcriptStatus: z.enum(['idle', 'transcribing', 'success', 'error']).optional(),
  transcriptError: z.string().optional(),
  waveformData: z.array(z.number()).optional(),
  interimTranscript: z.string().optional(),
  finalTranscripts: z.array(z.string()).optional(),
  isLiveRecording: z.boolean().optional(),
});

const YouTubeChannelVideoSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  thumbnail: z.string(),
  publishedAt: z.string(),
  duration: z.string(),
  viewCount: z.string(),
  selected: z.boolean(),
  transcript: z.string().optional(),
  transcriptStatus: z.enum(['loading', 'success', 'unavailable', 'error']).optional(),
});

const YouTubeNodeDataSchema = BaseNodeDataSchema.extend({
  url: z.string().optional(),
  mode: z.enum(['video', 'channel']).optional(),
  // Video fields
  videoId: z.string().optional(),
  title: z.string().optional(),
  thumbnail: z.string().optional(),
  transcript: z.string().optional(),
  transcriptStatus: z.enum(['loading', 'success', 'unavailable', 'error']).optional(),
  transcriptMethod: z.string().optional(),
  transcriptError: z.string().optional(),
  // Channel fields
  channelId: z.string().optional(),
  channelTitle: z.string().optional(),
  channelDescription: z.string().optional(),
  channelThumbnail: z.string().optional(),
  channelSubscriberCount: z.string().optional(),
  channelVideoCount: z.string().optional(),
  channelCustomUrl: z.string().optional(),
  channelVideos: z.array(YouTubeChannelVideoSchema).optional(),
  channelLoadStatus: z.enum(['idle', 'loading', 'success', 'error']).optional(),
  channelError: z.string().optional(),
  nextPageToken: z.string().optional(),
});

const InstagramAuthorSchema = z.object({
  username: z.string().optional(),
  fullName: z.string().optional(),
  profilePicUrl: z.string().optional(),
});

const InstagramNodeDataSchema = BaseNodeDataSchema.extend({
  url: z.string().optional(),
  reelCode: z.string().optional(),
  videoUrl: z.string().optional(),
  thumbnail: z.string().optional(),
  thumbnailFallback: z.string().optional(),
  images: z.array(z.string()).optional(),
  caption: z.string().optional(),
  author: InstagramAuthorSchema.optional(),
  likes: z.number().optional(),
  views: z.number().optional(),
  comments: z.number().optional(),
  duration: z.number().optional(),
  fetchStatus: z.enum(['idle', 'loading', 'success', 'error']).optional(),
  fetchError: z.string().optional(),
  isVideo: z.boolean().optional(),
  postType: z.string().optional(),
  storageStatus: z.enum(['idle', 'uploading', 'success', 'error']).optional(),
  storedVideoUrl: z.string().optional(),
  analysisStatus: z.enum(['idle', 'analyzing', 'success', 'error']).optional(),
  transcript: z.string().optional(),
  summary: z.string().optional(),
  fullAnalysis: z.string().optional(),
  ocrText: z.string().optional(),
  analysisError: z.string().optional(),
});

const LinkedInAuthorSchema = z.object({
  name: z.string().optional(),
  headline: z.string().optional(),
  profileUrl: z.string().optional(),
  profilePicUrl: z.string().optional(),
});

const LinkedInNodeDataSchema = BaseNodeDataSchema.extend({
  url: z.string().optional(),
  postId: z.string().optional(),
  content: z.string().optional(),
  imageUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  author: LinkedInAuthorSchema.optional(),
  reactions: z.number().optional(),
  comments: z.number().optional(),
  reposts: z.number().optional(),
  fetchStatus: z.enum(['idle', 'loading', 'success', 'error']).optional(),
  fetchError: z.string().optional(),
  postType: z.string().optional(),
  analysisStatus: z.enum(['idle', 'analyzing', 'success', 'error']).optional(),
  summary: z.string().optional(),
  keyPoints: z.array(z.string()).optional(),
  fullAnalysis: z.string().optional(),
  ocrText: z.string().optional(),
  analysisError: z.string().optional(),
});

const ImageAnalysisDataSchema = z.object({
  description: z.string(),
  tags: z.array(z.string()),
  colors: z.array(z.string()).optional(),
});

const ImageNodeDataSchema = BaseNodeDataSchema.extend({
  imageUrl: z.string().optional(),
  // imageFile is omitted - not serializable
  thumbnail: z.string().optional(),
  caption: z.string().optional(),
  uploadcareCdnUrl: z.string().optional(),
  uploadSource: z.enum(['url', 'uploadcare']).optional(),
  ocrText: z.string().optional(),
  analysisData: ImageAnalysisDataSchema.optional(),
  analysisStatus: z.enum(['idle', 'loading', 'analyzing', 'success', 'error']).optional(),
  analysisError: z.string().optional(),
});

const TextNodeDataSchema = BaseNodeDataSchema.extend({
  content: z.string(),
});

const MindMapNodeDataSchema = BaseNodeDataSchema.extend({
  concept: z.string(),
  notes: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  tags: z.array(z.string()).optional(),
  connections: z.array(z.string()).optional(),
});

const TemplateNodeDataSchema = BaseNodeDataSchema.extend({
  templateType: z.enum(['youtube-script', 'ad-copy', 'captions', 'blog-post', 'custom']),
  generatedContent: z.string().optional(),
  sourceNodes: z.array(z.string()).optional(),
  generationStatus: z.enum(['idle', 'generating', 'success', 'error']).optional(),
  generationError: z.string().optional(),
  customPrompt: z.string().optional(),
});

const WebpageMetadataSchema = z.object({
  description: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  author: z.string().optional(),
  publishedDate: z.string().optional(),
});

const WebpageNodeDataSchema = BaseNodeDataSchema.extend({
  url: z.string(),
  pageTitle: z.string().optional(),
  pageContent: z.string().optional(),
  metadata: WebpageMetadataSchema.optional(),
  scrapedImages: z.array(z.string()).optional(),
  scrapeStatus: z.enum(['idle', 'scraping', 'success', 'error']).optional(),
  scrapeError: z.string().optional(),
});

const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

const ChatNodeDataSchema = BaseNodeDataSchema.extend({
  messages: z.array(ChatMessageSchema),
  linkedNodes: z.array(z.string()),
  systemPrompt: z.string().optional(),
  model: z.enum(['gemini-2.5-flash', 'gemini-2.5-pro']),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  contextWindow: z.array(z.unknown()),
});

const ConnectorNodeDataSchema = BaseNodeDataSchema.extend({
  relationshipType: z.enum(['workflow', 'reference', 'dependency', 'custom']),
  fromNode: z.string().optional(),
  toNode: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const GroupNodeDataSchema = BaseNodeDataSchema.extend({
  groupedNodes: z.array(z.string()),
  groupColor: z.string().optional(),
  collapsed: z.boolean().optional(),
  groupChatEnabled: z.boolean().optional(),
  groupChatMessages: z.array(ChatMessageSchema).optional(),
});

// A discriminated union to handle the different node data types.
// This ensures that the `data` field of a node matches its `type`.
const NodeDataSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('pdf'), data: PDFNodeDataSchema }),
  z.object({ type: z.literal('voice'), data: VoiceNodeDataSchema }),
  z.object({ type: z.literal('youtube'), data: YouTubeNodeDataSchema }),
  z.object({ type: z.literal('instagram'), data: InstagramNodeDataSchema }),
  z.object({ type: z.literal('linkedin'), data: LinkedInNodeDataSchema }),
  z.object({ type: z.literal('image'), data: ImageNodeDataSchema }),
  z.object({ type: z.literal('text'), data: TextNodeDataSchema }),
  z.object({ type: z.literal('mindmap'), data: MindMapNodeDataSchema }),
  z.object({ type: z.literal('template'), data: TemplateNodeDataSchema }),
  z.object({ type: z.literal('webpage'), data: WebpageNodeDataSchema }),
  z.object({ type: z.literal('chat'), data: ChatNodeDataSchema }),
  z.object({ type: z.literal('connector'), data: ConnectorNodeDataSchema }),
  z.object({ type: z.literal('group'), data: GroupNodeDataSchema }),
]);

const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const WorkflowNodeSchema = z.object({
  id: z.string(),
  type: z.enum([
    'pdf', 'voice', 'image', 'youtube', 'instagram', 'linkedin', 'text',
    'mindmap', 'template', 'webpage', 'chat', 'connector', 'group'
  ]),
  position: PositionSchema,
  data: z.record(z.unknown()), // We'll validate this with the discriminated union later
}).catchall(z.unknown());

const WorkflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional().nullable(),
  targetHandle: z.string().optional().nullable(),
  type: z.string().optional(),
}).catchall(z.unknown());

const ViewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number(),
});

const WorkflowMetadataSchema = z.object({
  version: z.string(),
  tags: z.array(z.string()),
  isPublic: z.boolean(),
}).catchall(z.unknown());

export const WorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  nodes: z.array(WorkflowNodeSchema),
  edges: z.array(WorkflowEdgeSchema),
  viewport: ViewportSchema,
  metadata: WorkflowMetadataSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).refine(data => {
  // Custom refinement to validate the `data` field of each node against its `type`.
  // This is a workaround because Zod's discriminatedUnion can't be directly applied to `nodes.data`.
  for (const node of data.nodes) {
    const result = NodeDataSchema.safeParse({ type: node.type, data: node.data });
    if (!result.success) {
      // console.error(`Node data validation failed for node ${node.id} of type ${node.type}:`, result.error);
      return false;
    }
  }
  return true;
}, {
  message: "Node data does not match node type",
});
