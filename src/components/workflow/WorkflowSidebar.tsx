'use client';

import { DragEvent, useCallback, useState } from 'react';
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
}

const NODE_TYPES: NodeTypeConfig[] = [
  // Media
  {
    type: 'pdf',
    icon: <FileText className="h-4 w-4" />,
    label: 'PDF',
    category: 'media',
  },
  {
    type: 'voice',
    icon: <Mic className="h-4 w-4" />,
    label: 'Voice',
    category: 'media',
  },
  {
    type: 'youtube',
    icon: <Youtube className="h-4 w-4" />,
    label: 'YouTube',
    category: 'media',
  },
  {
    type: 'image',
    icon: <ImageIcon className="h-4 w-4" />,
    label: 'Image',
    category: 'media',
  },
  {
    type: 'webpage',
    icon: <Globe className="h-4 w-4" />,
    label: 'Webpage',
    category: 'media',
  },
  // Content
  {
    type: 'text',
    icon: <Type className="h-4 w-4" />,
    label: 'Text',
    category: 'content',
  },
  {
    type: 'mindmap',
    icon: <Lightbulb className="h-4 w-4" />,
    label: 'Idea',
    category: 'content',
  },
  // AI
  {
    type: 'template',
    icon: <Sparkles className="h-4 w-4" />,
    label: 'Template',
    category: 'ai',
  },
  {
    type: 'chat',
    icon: <MessageSquare className="h-4 w-4" />,
    label: 'Chat',
    category: 'ai',
  },
  // Structure
  {
    type: 'connector',
    icon: <Link2 className="h-4 w-4" />,
    label: 'Connect',
    category: 'structure',
  },
  {
    type: 'group',
    icon: <FolderTree className="h-4 w-4" />,
    label: 'Group',
    category: 'structure',
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

  const onDragStart = (event: DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const categories = Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>;

  const handleImageSidebarClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    console.log('Image node clicked, showing uploader');
    setShowImageUploader(true);
    clearSelection();
  }, [clearSelection]);

  const handleUploadSuccess = useCallback((cdnUrl: string) => {
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
      analysisStatus: 'loading',
    });

    selectNode(newNode.id);
  }, [addNode, selectNode, workflow]);

  const handleUploaderChange = useCallback(({ allEntries }: { allEntries?: Array<{ status: string; cdnUrl?: string }> }) => {
    const firstCompleted = allEntries?.find((entry) => entry.status === 'success' && entry.cdnUrl);
    if (firstCompleted?.cdnUrl) {
      setIsUploading(false);
      setShowImageUploader(false);
      handleUploadSuccess(firstCompleted.cdnUrl);
    } else if (allEntries && allEntries.some((entry) => entry.status === 'uploading')) {
      setIsUploading(true);
    }
  }, [handleUploadSuccess]);

  const hideUploader = useCallback(() => {
    if (!isUploading) {
      setShowImageUploader(false);
    }
  }, [isUploading]);

  return (
    <aside className="w-64 h-full bg-white border-r border-[#E8ECEF] flex flex-col overflow-y-auto relative">
      <div className="p-4 border-b border-[#E8ECEF]">
        <h2 className="text-sm font-semibold text-[#1F2937]">Add Nodes</h2>
        <p className="text-xs text-[#6B7280] mt-1">Drag to canvas</p>
      </div>

      <div className="flex-1 p-4 space-y-6">
        {categories.map((category) => {
          const categoryNodes = NODE_TYPES.filter((node) => node.category === category);
          
          return (
            <div key={category}>
              <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">
                {CATEGORY_LABELS[category]}
              </h3>
              <div className="space-y-2">
                {categoryNodes.map((node) => {
                  const isImageNode = node.type === 'image';

                  if (isImageNode) {
                    return (
                      <button
                        key={node.type}
                        type="button"
                        onClick={handleImageSidebarClick}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[#E8ECEF] bg-[#FAFBFC] hover:bg-[#F5F5F7] hover:border-[#CBD5E1] transition-all cursor-pointer group"
                      >
                        <div className="text-[#6B7280] group-hover:text-[#1F2937] transition-colors">
                          {node.icon}
                        </div>
                        <span className="text-sm font-medium text-[#1F2937]">
                          {node.label}
                        </span>
                      </button>
                    );
                  }

                  return (
                    <div
                      key={node.type}
                      draggable
                      onDragStart={(e) => onDragStart(e, node.type)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[#E8ECEF] bg-[#FAFBFC] hover:bg-[#F5F5F7] hover:border-[#CBD5E1] transition-all cursor-grab active:cursor-grabbing group"
                    >
                      <div className="text-[#6B7280] group-hover:text-[#1F2937] transition-colors">
                        {node.icon}
                      </div>
                      <span className="text-sm font-medium text-[#1F2937]">
                        {node.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Uploadcare Uploader Popup */}
      <AnimatePresence>
        {showImageUploader && (
          <motion.div
            className="absolute left-full top-4 ml-4 z-20"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="w-[320px] rounded-xl border border-[#E5E7EB] bg-white shadow-xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8ECEF]">
                <div>
                  <div className="text-[13px] font-semibold text-[#1F2937]">Upload Image</div>
                  <div className="text-[11px] text-[#6B7280] mt-0.5">Select from multiple sources</div>
                </div>
                <button
                  type="button"
                  onClick={hideUploader}
                  disabled={isUploading}
                  className="text-[#9CA3AF] hover:text-[#1F2937] disabled:opacity-40 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4">
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
        )}
      </AnimatePresence>
    </aside>
  );
}
