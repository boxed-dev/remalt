import type { NodeType } from '@/types/workflow';
import { FileText, Mic, Youtube, Instagram, Linkedin, Image as ImageIcon, Lightbulb, FileCode, Globe, MessageSquare, Link, Type, StickyNote, PenSquare, Play, Users, WandSparkles, BrainCircuit } from 'lucide-react';
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
  text: {
    type: 'text',
    label: 'Rich Text',
    description: 'Notion-style editor with markdown and slash commands',
    category: 'content',
    color: '#333333',
    icon: Type,
    defaultWidth: 600,
    defaultHeight: 400,
  },
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
    color: '#FF0000',
    icon: Youtube,
    defaultWidth: 480,
    defaultHeight: 340,
  },
  instagram: {
    type: 'instagram',
    label: 'Instagram Reel',
    description: 'Fetch Instagram reel data and video content',
    category: 'media',
    color: '#E1306C',
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
  'linkedin-creator': {
    type: 'linkedin-creator',
    label: 'LinkedIn Post Creator',
    description: 'AI-powered LinkedIn post generator with smart topic suggestions',
    category: 'ai',
    color: '#0A66C2',
    icon: Linkedin,
    defaultWidth: 900,
    defaultHeight: 620,
  },
  image: {
    type: 'image',
    label: 'Image',
    description: 'Upload images with AI analysis and OCR',
    category: 'media',
    color: '#6366F1',
    icon: ImageIcon,
    defaultWidth: 480,
    defaultHeight: 420,
  },
  'image-generation': {
    type: 'image-generation',
    label: 'AI Image Generator',
    description: 'Generate images from text using Nano Banana (Gemini 2.5 Flash Image)',
    category: 'ai',
    color: '#8B5CF6',
    icon: WandSparkles,
    defaultWidth: 480,
    defaultHeight: 520,
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
    color: '#333333',
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
    description: 'Container to organize nodes on the canvas',
    category: 'structure',
    color: '#D4AF7F',
    icon: Users,
    defaultWidth: 640,
    defaultHeight: 420,
  },
  sticky: {
    type: 'sticky',
    label: 'Sticky Note',
    description: 'Sticky notes for annotations and quick notes',
    category: 'content',
    color: '#FEF3C7',
    icon: StickyNote,
    defaultWidth: 280,
    defaultHeight: 280,
  },
  prompt: {
    type: 'prompt',
    label: 'AI Prompt',
    description: 'Transform and process data with custom AI prompts',
    category: 'ai',
    color: '#3B82F6',
    icon: BrainCircuit,
    defaultWidth: 380,
    defaultHeight: 400,
  },
  start: {
    type: 'start',
    label: 'Start / Trigger',
    description: 'Trigger button to execute workflow sequentially',
    category: 'structure',
    color: '#10B981',
    icon: Play,
    defaultWidth: 320,
    defaultHeight: 240,
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
