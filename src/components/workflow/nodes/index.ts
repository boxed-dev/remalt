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

export const nodeTypes: NodeTypes = {
  text: TextNode,
  pdf: PDFNode,
  voice: VoiceNode,
  youtube: YouTubeNode,
  instagram: InstagramNode,
  linkedin: LinkedInNode,
  'linkedin-creator': LinkedInCreatorNode,
  image: ImageNode,
  'image-generation': ImageGenerationNode,
  mindmap: MindMapNode,
  template: TemplateNode,
  webpage: WebpageNode,
  chat: ChatNode,
  connector: ConnectorNode,
  group: GroupNode,
  sticky: StickyNoteNode,
  prompt: PromptNode,
  start: StartNode,
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
