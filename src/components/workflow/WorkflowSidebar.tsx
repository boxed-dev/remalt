'use client';

import { useCallback, useState } from 'react';
import {
  FileText,
  Mic,
  Youtube,
  Image as ImageIcon,
  Type,
  Lightbulb,
  Sparkles,
  Globe,
  MessageSquare,
  Link2,
  FolderTree,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { NodeType } from '@/types/workflow';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import dynamic from 'next/dynamic';
import '@uploadcare/react-uploader/core.css';
import { motion, AnimatePresence } from 'framer-motion';

const UploadcareUploader = dynamic(async () => {
  const module = await import('@uploadcare/react-uploader/next');
  return module.FileUploaderRegular;
}, { ssr: false });

interface NodeTypeConfig {
  type: NodeType;
  icon: React.ReactNode;
  label: string;
  category: 'media' | 'content' | 'ai' | 'structure';
  tooltip?: string;
}

const NODE_TYPES: NodeTypeConfig[] = [
  // Media
  {
    type: 'pdf',
    icon: <FileText className="h-4 w-4" />,
    label: 'PDF',
    category: 'media',
    tooltip: 'Upload documents • Extract text instantly',
  },
  {
    type: 'voice',
    icon: <Mic className="h-4 w-4" />,
    label: 'Voice',
    category: 'media',
    tooltip: 'Record audio • Auto-transcribe speech',
  },
  {
    type: 'youtube',
    icon: <Youtube className="h-4 w-4" />,
    label: 'YouTube',
    category: 'media',
    tooltip: 'Any video URL • Full transcript extraction',
  },
  {
    type: 'image',
    icon: <ImageIcon className="h-4 w-4" />,
    label: 'Image',
    category: 'media',
    tooltip: 'Upload photos • AI vision analysis',
  },
  {
    type: 'webpage',
    icon: <Globe className="h-4 w-4" />,
    label: 'Webpage',
    category: 'media',
    tooltip: 'Paste any URL • Smart content extraction',
  },
  // Content
  {
    type: 'text',
    icon: <Type className="h-4 w-4" />,
    label: 'Text',
    category: 'content',
    tooltip: 'Quick notes • Rich text support',
  },
  {
    type: 'mindmap',
    icon: <Lightbulb className="h-4 w-4" />,
    label: 'Idea',
    category: 'content',
    tooltip: 'Capture thoughts • Tag and organize',
  },
  // AI
  {
    type: 'template',
    icon: <Sparkles className="h-4 w-4" />,
    label: 'Template',
    category: 'ai',
    tooltip: 'Ready-made prompts • Instant generation',
  },
  {
    type: 'chat',
    icon: <MessageSquare className="h-4 w-4" />,
    label: 'Chat',
    category: 'ai',
    tooltip: 'AI assistant • Context-aware conversations',
  },
  // Structure
  {
    type: 'connector',
    icon: <Link2 className="h-4 w-4" />,
    label: 'Connect',
    category: 'structure',
    tooltip: 'Link nodes • Define relationships',
  },
  {
    type: 'group',
    icon: <FolderTree className="h-4 w-4" />,
    label: 'Group',
    category: 'structure',
    tooltip: 'Organize nodes • Unified AI chat',
  },
];

const CATEGORY_LABELS = {
  media: 'Media',
  content: 'Content',
  ai: 'AI',
  structure: 'Structure',
};

export function WorkflowSidebar() {
  const workflow = useWorkflowStore((state) => state.workflow);
  const addNode = useWorkflowStore((state) => state.addNode);
  const selectNode = useWorkflowStore((state) => state.selectNode);
  const clearSelection = useWorkflowStore((state) => state.clearSelection);
  const [showImageUploader, setShowImageUploader] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleNodeClick = useCallback((nodeType: NodeType) => {
    const viewport = workflow?.viewport;
    const sidebarWidth = isExpanded ? 240 : 56;
    const centerPosition = viewport
      ? {
          x: -viewport.x / (viewport.zoom || 1) + (window.innerWidth - sidebarWidth) / 2 / (viewport.zoom || 1),
          y: -viewport.y / (viewport.zoom || 1) + window.innerHeight / 2 / (viewport.zoom || 1),
        }
      : { x: 400, y: 300 };

    const newNode = addNode(nodeType, centerPosition);
    clearSelection();
    selectNode(newNode.id);
  }, [workflow, addNode, clearSelection, selectNode, isExpanded]);

  const handleImageSidebarClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    console.log('Image node clicked, showing uploader');
    setShowImageUploader(true);
    clearSelection();
  }, [clearSelection]);

  const handleUploadSuccess = useCallback((cdnUrl: string) => {
    console.log('Upload success, CDN URL:', cdnUrl);
    const viewport = workflow?.viewport;
    const basePosition = viewport
      ? {
          x: viewport.x + (viewport.zoom ? (280 / viewport.zoom) : 280),
          y: viewport.y + (viewport.zoom ? (120 / viewport.zoom) : 120),
        }
      : { x: 120, y: 120 };

    const newNode = addNode('image', basePosition, {
      imageUrl: cdnUrl,
      thumbnail: cdnUrl,
      uploadcareCdnUrl: cdnUrl,
      uploadSource: 'uploadcare',
      analysisStatus: 'idle',
    });

    selectNode(newNode.id);

    // Trigger analysis automatically
    setTimeout(() => {
      const imageNodeElement = document.querySelector(`[data-id="${newNode.id}"]`);
      if (imageNodeElement) {
        console.log('Image node created, triggering analysis');
      }
    }, 500);
  }, [addNode, selectNode, workflow]);

  const handleUploaderChange = useCallback((event: any) => {
    console.log('Uploader change event:', event);
    const allEntries = event?.allEntries || event?.successEntries || [];
    const firstCompleted = allEntries.find((entry: any) => entry.status === 'success' && entry.cdnUrl);
    if (firstCompleted?.cdnUrl) {
      console.log('File uploaded successfully:', firstCompleted.cdnUrl);
      setIsUploading(false);
      setShowImageUploader(false);
      handleUploadSuccess(firstCompleted.cdnUrl);
    } else if (event?.uploadingCount > 0 || allEntries.some((entry: any) => entry.status === 'uploading')) {
      console.log('Upload in progress...');
      setIsUploading(true);
    }
  }, [handleUploadSuccess]);

  const hideUploader = useCallback(() => {
    if (!isUploading) {
      setShowImageUploader(false);
    }
  }, [isUploading]);

  // Group nodes by category
  const nodesByCategory = NODE_TYPES.reduce((acc, node) => {
    if (!acc[node.category]) {
      acc[node.category] = [];
    }
    acc[node.category].push(node);
    return acc;
  }, {} as Record<string, NodeTypeConfig[]>);

  return (
    <>
      {/* Vertical Left Sidebar */}
      <aside
        className={`fixed left-0 bottom-0 bg-white border-r border-[#D4AF7F]/20 flex flex-col z-[50] transition-all duration-300 ${
          isExpanded ? 'w-60' : 'w-14'
        }`}
        style={{ top: '56px' }}
      >
        {/* Header with toggle only */}
        <div className={`flex items-center border-b border-[#D4AF7F]/20 ${isExpanded ? 'justify-between px-4 py-3' : 'justify-center py-3 px-3'}`}>
          {isExpanded && (
            <h2 className="text-[13px] font-semibold text-[#095D40]">Add Nodes</h2>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-lg hover:bg-[#D4AF7F]/10 text-[#6B7280] hover:text-[#095D40] transition-colors flex-shrink-0 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#095D40]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            title={isExpanded ? 'Collapse • More canvas space' : 'Expand • See all nodes'}
            style={{ minWidth: '32px', minHeight: '32px' }}
          >
            {isExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>

        {/* Scrollable content */}
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3"
          data-lenis-prevent
          data-lenis-prevent-wheel
          data-lenis-prevent-touch
        >
          {isExpanded ? (
            // Expanded view - grouped by category
            <div className="space-y-6">
              {(Object.keys(nodesByCategory) as Array<keyof typeof CATEGORY_LABELS>).map((category) => (
                <div key={category}>
                  <div className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-2 px-2">
                    {CATEGORY_LABELS[category]}
                  </div>
                  <div className="space-y-1">
                    {nodesByCategory[category].map((node) => {
                      const isImageNode = node.type === 'image';

                      return (
                        <button
                          key={node.type}
                          type="button"
                          onClick={isImageNode ? handleImageSidebarClick : () => handleNodeClick(node.type)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent hover:border-[#D4AF7F]/30 hover:bg-[#D4AF7F]/10 transition-all cursor-pointer group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#095D40]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                          title={node.tooltip || node.label}
                        >
                          <div className="text-[#6B7280] group-hover:text-[#095D40] transition-colors flex-shrink-0">
                            {node.icon}
                          </div>
                          <span className="text-[13px] text-[#333333] font-medium group-hover:text-[#095D40] transition-colors">
                            {node.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Collapsed view - icons only
            <div className="flex flex-col items-center gap-2">
              {NODE_TYPES.map((node) => {
                const isImageNode = node.type === 'image';

                return (
                  <button
                    key={node.type}
                    type="button"
                    onClick={isImageNode ? handleImageSidebarClick : () => handleNodeClick(node.type)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-transparent hover:border-[#D4AF7F]/30 hover:bg-[#D4AF7F]/10 transition-all cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#095D40]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                    title={node.tooltip || node.label}
                  >
                    <div className="text-[#6B7280] group-hover:text-[#095D40] transition-colors">
                      {node.icon}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* Uploadcare Uploader Modal */}
      <AnimatePresence>
        {showImageUploader && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/50 z-[100]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={hideUploader}
            />
            {/* Modal */}
            <motion.div
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101]"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-[420px] max-w-[90vw] max-h-[80vh] rounded-xl border border-[#D4AF7F]/30 bg-white shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#D4AF7F]/20 bg-gradient-to-r from-[#D4AF7F]/5 to-white">
                  <div>
                    <div className="text-[14px] font-semibold text-[#333333]">Upload Image</div>
                    <div className="text-[11px] text-[#6B7280] mt-0.5">Select from multiple sources</div>
                  </div>
                  <button
                    type="button"
                    onClick={hideUploader}
                    disabled={isUploading}
                    className="text-[#9CA3AF] hover:text-[#095D40] disabled:opacity-40 transition-colors p-1 rounded hover:bg-white"
                    title="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-6 bg-white">
                  <UploadcareUploader
                    pubkey="94c0b598f78b9fe9b471"
                    classNameUploader="uc-light uc-purple"
                    sourceList="local, camera, gdrive, facebook"
                    filesViewMode="grid"
                    userAgentIntegration="remalt-next"
                    onChange={handleUploaderChange}
                  />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
