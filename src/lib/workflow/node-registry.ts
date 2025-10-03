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
    color: '#ef4444',
    defaultWidth: 400,
    defaultHeight: 300,
  },
  voice: {
    type: 'voice',
    label: 'Voice Note',
    description: 'Record or upload audio with automatic transcription',
    category: 'media',
    color: '#8b5cf6',
    defaultWidth: 400,
    defaultHeight: 250,
  },
  youtube: {
    type: 'youtube',
    label: 'YouTube Video',
    description: 'Extract transcripts from YouTube videos',
    category: 'media',
    color: '#ff0000',
    defaultWidth: 400,
    defaultHeight: 280,
  },
  image: {
    type: 'image',
    label: 'Image',
    description: 'Upload images with AI analysis and OCR',
    category: 'media',
    color: '#f59e0b',
    defaultWidth: 400,
    defaultHeight: 350,
  },
  text: {
    type: 'text',
    label: 'Text / Note',
    description: 'Rich text editor for ideas and content',
    category: 'content',
    color: '#3b82f6',
    defaultWidth: 400,
    defaultHeight: 200,
  },
  mindmap: {
    type: 'mindmap',
    label: 'Mind Map / Idea',
    description: 'Concept bubbles for brainstorming and ideation',
    category: 'content',
    color: '#ec4899',
    defaultWidth: 250,
    defaultHeight: 150,
  },
  template: {
    type: 'template',
    label: 'Template / Workflow',
    description: 'Generate content using AI templates (scripts, ads, captions)',
    category: 'ai',
    color: '#10b981',
    defaultWidth: 400,
    defaultHeight: 350,
  },
  webpage: {
    type: 'webpage',
    label: 'Webpage / URL',
    description: 'Scrape and extract content from web pages',
    category: 'media',
    color: '#06b6d4',
    defaultWidth: 400,
    defaultHeight: 300,
  },
  chat: {
    type: 'chat',
    label: 'Chat / Assistant',
    description: 'Conversational AI with context awareness',
    category: 'ai',
    color: '#14b8a6',
    defaultWidth: 480,
    defaultHeight: 560,
  },
  connector: {
    type: 'connector',
    label: 'Connector',
    description: 'Define relationships and workflow steps between nodes',
    category: 'structure',
    color: '#6366f1',
    defaultWidth: 200,
    defaultHeight: 100,
  },
  group: {
    type: 'group',
    label: 'Group',
    description: 'Group nodes together with optional group chat',
    category: 'structure',
    color: '#6b7280',
    defaultWidth: 600,
    defaultHeight: 400,
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
