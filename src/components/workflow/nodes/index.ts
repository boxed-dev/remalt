import type { NodeTypes } from '@xyflow/react';
import { PDFNode } from './PDFNode';
import { VoiceNode } from './VoiceNode';
import { YouTubeNode } from './YouTubeNode';
import { ImageNode } from './ImageNode';
import { TextNode } from './TextNode';
import { MindMapNode } from './MindMapNode';
import { TemplateNode } from './TemplateNode';
import { WebpageNode } from './WebpageNode';
import { ChatNode } from './ChatNode';
import { ConnectorNode } from './ConnectorNode';
import { GroupNode } from './GroupNode';

export const nodeTypes: NodeTypes = {
  pdf: PDFNode,
  voice: VoiceNode,
  youtube: YouTubeNode,
  image: ImageNode,
  text: TextNode,
  mindmap: MindMapNode,
  template: TemplateNode,
  webpage: WebpageNode,
  chat: ChatNode,
  connector: ConnectorNode,
  group: GroupNode,
};

export {
  PDFNode,
  VoiceNode,
  YouTubeNode,
  ImageNode,
  TextNode,
  MindMapNode,
  TemplateNode,
  WebpageNode,
  ChatNode,
  ConnectorNode,
  GroupNode,
};
