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

  return (
    <>
      {/* Vertical Left Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-14 bg-white border-r border-[#E8ECEF] flex flex-col items-center py-4 gap-2 z-10">
        {NODE_TYPES.map((node) => {
          const isImageNode = node.type === 'image';

          // Image node - click to upload
          if (isImageNode) {
            return (
              <button
                key={node.type}
                type="button"
                onClick={handleImageSidebarClick}
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-transparent hover:border-[#E8ECEF] hover:bg-[#F5F5F7] transition-all cursor-pointer group"
                title={node.label}
              >
                <div className="text-[#6B7280] group-hover:text-[#1F2937] transition-colors">
                  {node.icon}
                </div>
              </button>
            );
          }

          // Default - draggable node
          return (
            <div
              key={node.type}
              draggable
              onDragStart={(e) => onDragStart(e, node.type)}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-transparent hover:border-[#E8ECEF] hover:bg-[#F5F5F7] transition-all cursor-grab active:cursor-grabbing group"
              title={node.label}
            >
              <div className="text-[#6B7280] group-hover:text-[#1F2937] transition-colors">
                {node.icon}
              </div>
            </div>
          );
        })}
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
              <div className="w-[420px] max-w-[90vw] max-h-[80vh] rounded-xl border border-[#E5E7EB] bg-white shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8ECEF] bg-gradient-to-r from-[#F9FAFB] to-white">
                  <div>
                    <div className="text-[14px] font-semibold text-[#1F2937]">Upload Image</div>
                    <div className="text-[11px] text-[#6B7280] mt-0.5">Select from multiple sources</div>
                  </div>
                  <button
                    type="button"
                    onClick={hideUploader}
                    disabled={isUploading}
                    className="text-[#9CA3AF] hover:text-[#1F2937] disabled:opacity-40 transition-colors p-1 rounded hover:bg-white"
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
