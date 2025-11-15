import { memo } from 'react';
import type { NodeTypes } from '@xyflow/react';
import { TextNode } from './TextNode';
import { PDFNode } from './PDFNode';
import { VoiceNode } from './VoiceNode';
import { YouTubeNode } from './YouTubeNode';
import { InstagramNode } from './InstagramNode';
import { LinkedInNode } from './LinkedInNode';
import { LinkedInCreatorNode } from './LinkedInCreatorNode';
import { ImageNode } from './ImageNode';
import { ImageGenerationNode } from './ImageGenerationNode';
import { MindMapNode } from './MindMapNode';
import { TemplateNode } from './TemplateNode';
import { WebpageNode } from './WebpageNode';
import { ChatNode } from './ChatNode';
import { ConnectorNode } from './ConnectorNode';
import { GroupNode } from './GroupNode';
import { StickyNoteNode } from './StickyNoteNode';
import { PromptNode } from './PromptNode';
import { StartNode } from './StartNode';

// Wrap all node components with React.memo to prevent unnecessary re-renders
// Nodes will only re-render when their props actually change
const MemoizedTextNode = memo(TextNode);
const MemoizedPDFNode = memo(PDFNode);
const MemoizedVoiceNode = memo(VoiceNode);
const MemoizedYouTubeNode = memo(YouTubeNode);
const MemoizedInstagramNode = memo(InstagramNode);
const MemoizedLinkedInNode = memo(LinkedInNode);
const MemoizedLinkedInCreatorNode = memo(LinkedInCreatorNode);
const MemoizedImageNode = memo(ImageNode);
const MemoizedImageGenerationNode = memo(ImageGenerationNode);
const MemoizedMindMapNode = memo(MindMapNode);
const MemoizedTemplateNode = memo(TemplateNode);
const MemoizedWebpageNode = memo(WebpageNode);
const MemoizedChatNode = memo(ChatNode);
const MemoizedConnectorNode = memo(ConnectorNode);
const MemoizedGroupNode = memo(GroupNode);
const MemoizedStickyNoteNode = memo(StickyNoteNode);
const MemoizedPromptNode = memo(PromptNode);
const MemoizedStartNode = memo(StartNode);

export const nodeTypes: NodeTypes = {
  text: MemoizedTextNode,
  pdf: MemoizedPDFNode,
  voice: MemoizedVoiceNode,
  youtube: MemoizedYouTubeNode,
  instagram: MemoizedInstagramNode,
  linkedin: MemoizedLinkedInNode,
  'linkedin-creator': MemoizedLinkedInCreatorNode,
  image: MemoizedImageNode,
  'image-generation': MemoizedImageGenerationNode,
  mindmap: MemoizedMindMapNode,
  template: MemoizedTemplateNode,
  webpage: MemoizedWebpageNode,
  chat: MemoizedChatNode,
  connector: MemoizedConnectorNode,
  group: MemoizedGroupNode,
  sticky: MemoizedStickyNoteNode,
  prompt: MemoizedPromptNode,
  start: MemoizedStartNode,
};

export {
  TextNode,
  PDFNode,
  VoiceNode,
  YouTubeNode,
  InstagramNode,
  LinkedInNode,
  LinkedInCreatorNode,
  ImageNode,
  ImageGenerationNode,
  MindMapNode,
  TemplateNode,
  WebpageNode,
  ChatNode,
  ConnectorNode,
  GroupNode,
  StickyNoteNode,
  PromptNode,
  StartNode,
};
