import type { NodeType } from '@/types/workflow';

// Node type metadata
export interface NodeTypeMetadata {
  type: NodeType;
  label: string;
  description: string;
  category: 'media' | 'content' | 'ai' | 'structure';
  color: string;
  defaultWidth?: number;
  defaultHeight?: number;
}

export const NODE_METADATA: Record<NodeType, NodeTypeMetadata> = {
  pdf: {
    type: 'pdf',
    label: 'PDF / Document',
    description: 'Upload or link documents with searchable parsed content',
    category: 'media',
    color: '#095D40',
    defaultWidth: 480,
    defaultHeight: 360,
  },
  voice: {
    type: 'voice',
    label: 'Voice Note',
    description: 'Record or upload audio with automatic transcription',
    category: 'media',
    color: '#D4AF7F',
    defaultWidth: 480,
    defaultHeight: 300,
  },
  youtube: {
    type: 'youtube',
    label: 'YouTube Video',
    description: 'Extract transcripts from YouTube videos',
    category: 'media',
    color: '#095D40',
    defaultWidth: 480,
    defaultHeight: 340,
  },
  image: {
    type: 'image',
    label: 'Image',
    description: 'Upload images with AI analysis and OCR',
    category: 'media',
    color: '#D4AF7F',
    defaultWidth: 480,
    defaultHeight: 420,
  },
  text: {
    type: 'text',
    label: 'Text / Note',
    description: 'Rich text editor for ideas and content',
    category: 'content',
    color: '#095D40',
    defaultWidth: 480,
    defaultHeight: 240,
  },
  mindmap: {
    type: 'mindmap',
    label: 'Mind Map / Idea',
    description: 'Concept bubbles for brainstorming and ideation',
    category: 'content',
    color: '#D4AF7F',
    defaultWidth: 300,
    defaultHeight: 180,
  },
  template: {
    type: 'template',
    label: 'Template / Workflow',
    description: 'Generate content using AI templates (scripts, ads, captions)',
    category: 'ai',
    color: '#095D40',
    defaultWidth: 480,
    defaultHeight: 420,
  },
  webpage: {
    type: 'webpage',
    label: 'Webpage / URL',
    description: 'Scrape and extract content from web pages',
    category: 'media',
    color: '#D4AF7F',
    defaultWidth: 480,
    defaultHeight: 360,
  },
  chat: {
    type: 'chat',
    label: 'Chat / Assistant',
    description: 'Conversational AI with context awareness',
    category: 'ai',
    color: '#095D40',
    defaultWidth: 560,
    defaultHeight: 640,
  },
  connector: {
    type: 'connector',
    label: 'Connector',
    description: 'Define relationships and workflow steps between nodes',
    category: 'structure',
    color: '#333333',
    defaultWidth: 240,
    defaultHeight: 120,
  },
  group: {
    type: 'group',
    label: 'Group',
    description: 'Group nodes together with optional group chat',
    category: 'structure',
    color: '#6b7280',
    defaultWidth: 720,
    defaultHeight: 480,
  },
};

export function getNodeMetadata(type: NodeType): NodeTypeMetadata {
  return NODE_METADATA[type];
}

export function getNodesByCategory(category: NodeTypeMetadata['category']): NodeTypeMetadata[] {
  return Object.values(NODE_METADATA).filter((meta) => meta.category === category);
}

export function getAllNodeTypes(): NodeTypeMetadata[] {
  return Object.values(NODE_METADATA);
}
