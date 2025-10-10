import type { NodeType } from '@/types/workflow';
import { FileText, Mic, Youtube, Instagram, Linkedin, Image as ImageIcon, Type, Lightbulb, FileCode, Globe, MessageSquare, Link, Folder } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Node type metadata
export interface NodeTypeMetadata {
  type: NodeType;
  label: string;
  description: string;
  category: 'media' | 'content' | 'ai' | 'structure';
  color: string;
  icon: LucideIcon;
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
    icon: FileText,
    defaultWidth: 480,
    defaultHeight: 360,
  },
  voice: {
    type: 'voice',
    label: 'Voice Note',
    description: 'Record or upload audio with automatic transcription',
    category: 'media',
    color: '#D4AF7F',
    icon: Mic,
    defaultWidth: 480,
    defaultHeight: 300,
  },
  youtube: {
    type: 'youtube',
    label: 'YouTube Video',
    description: 'Extract transcripts from YouTube videos',
    category: 'media',
    color: '#095D40',
    icon: Youtube,
    defaultWidth: 480,
    defaultHeight: 340,
  },
  instagram: {
    type: 'instagram',
    label: 'Instagram Reel',
    description: 'Fetch Instagram reel data and video content',
    category: 'media',
    color: '#E4405F',
    icon: Instagram,
    defaultWidth: 380,
    defaultHeight: 280,
  },
  linkedin: {
    type: 'linkedin',
    label: 'LinkedIn Post',
    description: 'Fetch LinkedIn post content and engagement data',
    category: 'media',
    color: '#0A66C2',
    icon: Linkedin,
    defaultWidth: 420,
    defaultHeight: 320,
  },
  image: {
    type: 'image',
    label: 'Image',
    description: 'Upload images with AI analysis and OCR',
    category: 'media',
    color: '#D4AF7F',
    icon: ImageIcon,
    defaultWidth: 480,
    defaultHeight: 420,
  },
  text: {
    type: 'text',
    label: 'Text / Note',
    description: 'Rich text editor for ideas and content',
    category: 'content',
    color: '#095D40',
    icon: Type,
    defaultWidth: 480,
    defaultHeight: 240,
  },
  mindmap: {
    type: 'mindmap',
    label: 'Mind Map / Idea',
    description: 'Concept bubbles for brainstorming and ideation',
    category: 'content',
    color: '#D4AF7F',
    icon: Lightbulb,
    defaultWidth: 300,
    defaultHeight: 180,
  },
  template: {
    type: 'template',
    label: 'Template / Workflow',
    description: 'Generate content using AI templates (scripts, ads, captions)',
    category: 'ai',
    color: '#095D40',
    icon: FileCode,
    defaultWidth: 480,
    defaultHeight: 420,
  },
  webpage: {
    type: 'webpage',
    label: 'Webpage / URL',
    description: 'Scrape and extract content from web pages',
    category: 'media',
    color: '#D4AF7F',
    icon: Globe,
    defaultWidth: 480,
    defaultHeight: 360,
  },
  chat: {
    type: 'chat',
    label: 'Chat / Assistant',
    description: 'Conversational AI with context awareness',
    category: 'ai',
    color: '#095D40',
    icon: MessageSquare,
    defaultWidth: 560,
    defaultHeight: 640,
  },
  connector: {
    type: 'connector',
    label: 'Connector',
    description: 'Define relationships and workflow steps between nodes',
    category: 'structure',
    color: '#333333',
    icon: Link,
    defaultWidth: 240,
    defaultHeight: 120,
  },
  group: {
    type: 'group',
    label: 'Group',
    description: 'Group nodes together with optional group chat',
    category: 'structure',
    color: '#6b7280',
    icon: Folder,
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
