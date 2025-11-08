import type { NodeTypes } from '@xyflow/react';
import { TextNode } from './TextNode';
import { PDFNode } from './PDFNode';
import { VoiceNode } from './VoiceNode';
import { YouTubeNode } from './YouTubeNode';
import { InstagramNode } from './InstagramNode';
import { LinkedInNode } from './LinkedInNode';
import { LinkedInCreatorNode } from './LinkedInCreatorNode';
import { ImageNode } from './ImageNode';
import { MindMapNode } from './MindMapNode';
import { TemplateNode } from './TemplateNode';
import { WebpageNode } from './WebpageNode';
import { ChatNode } from './ChatNode';
import { ConnectorNode } from './ConnectorNode';
import { GroupNode } from './GroupNode';
import { StickyNoteNode } from './StickyNoteNode';

export const nodeTypes: NodeTypes = {
  text: TextNode,
  pdf: PDFNode,
  voice: VoiceNode,
  youtube: YouTubeNode,
  instagram: InstagramNode,
  linkedin: LinkedInNode,
  'linkedin-creator': LinkedInCreatorNode,
  image: ImageNode,
  mindmap: MindMapNode,
  template: TemplateNode,
  webpage: WebpageNode,
  chat: ChatNode,
  connector: ConnectorNode,
  group: GroupNode,
  sticky: StickyNoteNode,
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
  MindMapNode,
  TemplateNode,
  WebpageNode,
  ChatNode,
  ConnectorNode,
  GroupNode,
  StickyNoteNode,
};
