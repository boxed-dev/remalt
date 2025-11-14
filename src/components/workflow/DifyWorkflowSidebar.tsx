'use client';

import { useState } from 'react';
import {
  FileText,
  Microphone,
  YoutubeLogo,
  Image as ImageIcon,
  InstagramLogo,
  LinkedinLogo,
  TextT,
  Globe,
  ChatCircle,
  Monitor,
  Sparkle,
  MagicWand,
  Play as PlayIcon,
} from '@phosphor-icons/react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { NodeType } from '@/types/workflow';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { SocialMediaDialog } from './SocialMediaDialog';
import { UploadMediaDialog } from './UploadMediaDialog';

export function DifyWorkflowSidebar() {
  const addNode = useWorkflowStore((state) => state.addNode);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const workflow = useWorkflowStore((state) => state.workflow);
  const [draggedNode, setDraggedNode] = useState<NodeType | null>(null);
  const [socialMediaDialogOpen, setSocialMediaDialogOpen] = useState(false);
  const [uploadMediaDialogOpen, setUploadMediaDialogOpen] = useState(false);
  const [uploadNodeType, setUploadNodeType] = useState<'image' | 'pdf'>('image');

  const getCenterPosition = () => {
    const viewport = workflow?.viewport || { x: 0, y: 0, zoom: 1 };
    const windowCenterX = window.innerWidth / 2;
    const windowCenterY = window.innerHeight / 2;
    return {
      x: (windowCenterX - viewport.x) / viewport.zoom,
      y: (windowCenterY - viewport.y) / viewport.zoom - 100,
    };
  };

  const handleDragStart = (e: React.DragEvent, nodeType: NodeType) => {
    setDraggedNode(nodeType);
    e.dataTransfer.setData('application/reactflow', nodeType);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setTimeout(() => setDraggedNode(null), 100);
  };

  const handleNodeClick = (nodeType: NodeType, requiresDialog?: 'social' | 'upload') => {
    if (draggedNode) return;

    if (requiresDialog === 'upload') {
      setUploadNodeType(nodeType as 'image' | 'pdf');
      setUploadMediaDialogOpen(true);
      return;
    }

    if (requiresDialog === 'social') {
      setSocialMediaDialogOpen(true);
      return;
    }

    const centerPosition = getCenterPosition();
    addNode(nodeType, centerPosition);
  };

  const handleSocialMediaAdd = (type: 'instagram' | 'linkedin' | 'youtube' | 'webpage', url: string) => {
    const centerPosition = getCenterPosition();
    const newNode = addNode(type, centerPosition);
    updateNodeData(newNode.id, { url });
  };

  return (
    <>
      <TooltipProvider delayDuration={300}>
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none overflow-visible flex flex-col gap-3">

          {/* SECTION 1: AI TOOLS */}
          <aside className="bg-white rounded-xl shadow-lg border border-gray-200/80 py-2 px-1 pointer-events-auto w-12 flex flex-col items-center gap-1 overflow-visible">
            {/* Prompt */}
            <Tooltip side="right" sideOffset={8}>
              <TooltipTrigger asChild>
                <button
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'prompt')}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleNodeClick('prompt')}
                  className="flex items-center justify-center w-12 h-12 rounded-lg hover:bg-[#D4E5DF] transition-colors cursor-grab active:cursor-grabbing"
                >
                  <MagicWand size={24} weight="duotone" className="text-gray-600 hover:text-[#095D40]" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-900 text-white border-0 shadow-lg text-[12px] px-3 py-1.5"><p>AI Prompt</p></TooltipContent>
            </Tooltip>

            {/* Image Gen */}
            <Tooltip side="right" sideOffset={8}>
              <TooltipTrigger asChild>
                <button
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'image-generation')}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleNodeClick('image-generation')}
                  className="flex items-center justify-center w-12 h-12 rounded-lg hover:bg-[#D4E5DF] transition-colors cursor-grab active:cursor-grabbing"
                >
                  <Sparkle size={24} weight="duotone" className="text-gray-600 hover:text-[#095D40]" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-900 text-white border-0 shadow-lg text-[12px] px-3 py-1.5"><p>AI Image</p></TooltipContent>
            </Tooltip>

            {/* Chat */}
            <Tooltip side="right" sideOffset={8}>
              <TooltipTrigger asChild>
                <button
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'chat')}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleNodeClick('chat')}
                  className="flex items-center justify-center w-12 h-12 rounded-lg hover:bg-[#D4E5DF] transition-colors cursor-grab active:cursor-grabbing"
                >
                  <ChatCircle size={24} weight="duotone" className="text-gray-600 hover:text-[#095D40]" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-900 text-white border-0 shadow-lg text-[12px] px-3 py-1.5"><p>Chat</p></TooltipContent>
            </Tooltip>

          </aside>

          {/* SECTION 2: MEDIA/INPUT */}
          <aside className="bg-white rounded-xl shadow-lg border border-gray-200/80 py-2 px-1 pointer-events-auto w-12 flex flex-col items-center gap-1 overflow-visible">
            {/* Social Media 2x2 Grid */}
            <Tooltip side="right" sideOffset={8}>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSocialMediaDialogOpen(true);
                  }}
                  className="flex items-center justify-center w-12 h-12 group"
                >
                  <div className="flex flex-col gap-0.5 group-hover:scale-105 transition-transform">
                    <div className="flex gap-0.5">
                      <div className="p-0.5 bg-gray-100 rounded group-hover:bg-[#B8D5C9] transition-colors">
                        <Globe size={13} weight="fill" className="text-gray-600 group-hover:text-[#095D40]" />
                      </div>
                      <div className="p-0.5 bg-gray-100 rounded group-hover:bg-[#B8D5C9] transition-colors">
                        <YoutubeLogo size={13} weight="fill" className="text-gray-600 group-hover:text-[#095D40]" />
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      <div className="p-0.5 bg-gray-100 rounded group-hover:bg-[#B8D5C9] transition-colors">
                        <InstagramLogo size={13} weight="fill" className="text-gray-600 group-hover:text-[#095D40]" />
                      </div>
                      <div className="p-0.5 bg-gray-100 rounded group-hover:bg-[#B8D5C9] transition-colors">
                        <LinkedinLogo size={13} weight="fill" className="text-gray-600 group-hover:text-[#095D40]" />
                      </div>
                    </div>
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-900 text-white border-0 shadow-lg text-[12px] px-3 py-1.5">
                <p>Social media sources</p>
              </TooltipContent>
            </Tooltip>

            {/* Text */}
            <Tooltip side="right" sideOffset={8}>
              <TooltipTrigger asChild>
                <button
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'text')}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleNodeClick('text')}
                  className="flex items-center justify-center w-12 h-12 rounded-lg hover:bg-[#D4E5DF] transition-colors cursor-grab active:cursor-grabbing"
                >
                  <TextT size={24} weight="regular" className="text-gray-600 hover:text-[#095D40]" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-900 text-white border-0 shadow-lg text-[12px] px-3 py-1.5"><p>Text</p></TooltipContent>
            </Tooltip>

            {/* Image */}
            <Tooltip side="right" sideOffset={8}>
              <TooltipTrigger asChild>
                <button
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'image')}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleNodeClick('image', 'upload')}
                  className="flex items-center justify-center w-12 h-12 rounded-lg hover:bg-[#D4E5DF] transition-colors cursor-grab active:cursor-grabbing"
                >
                  <ImageIcon size={24} weight="duotone" className="text-gray-600 hover:text-[#095D40]" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-900 text-white border-0 shadow-lg text-[12px] px-3 py-1.5"><p>Image</p></TooltipContent>
            </Tooltip>

            {/* PDF */}
            <Tooltip side="right" sideOffset={8}>
              <TooltipTrigger asChild>
                <button
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'pdf')}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleNodeClick('pdf', 'upload')}
                  className="flex items-center justify-center w-12 h-12 rounded-lg hover:bg-[#D4E5DF] transition-colors cursor-grab active:cursor-grabbing"
                >
                  <FileText size={24} weight="duotone" className="text-gray-600 hover:text-[#095D40]" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-900 text-white border-0 shadow-lg text-[12px] px-3 py-1.5"><p>PDF</p></TooltipContent>
            </Tooltip>

            {/* Voice */}
            <Tooltip side="right" sideOffset={8}>
              <TooltipTrigger asChild>
                <button
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'voice')}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleNodeClick('voice')}
                  className="flex items-center justify-center w-12 h-12 rounded-lg hover:bg-[#D4E5DF] transition-colors cursor-grab active:cursor-grabbing"
                >
                  <Microphone size={24} weight="duotone" className="text-gray-600 hover:text-[#095D40]" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-900 text-white border-0 shadow-lg text-[12px] px-3 py-1.5"><p>Voice</p></TooltipContent>
            </Tooltip>
          </aside>

          {/* SECTION 3: STRUCTURE/UTILITIES */}
          <aside className="bg-white rounded-xl shadow-lg border border-gray-200/80 py-2 px-1 pointer-events-auto w-12 flex flex-col items-center gap-1 overflow-visible">
            {/* Start */}
            <Tooltip side="right" sideOffset={8}>
              <TooltipTrigger asChild>
                <button
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'start')}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleNodeClick('start')}
                  className="flex items-center justify-center w-12 h-12 rounded-lg hover:bg-[#D4E5DF] transition-colors cursor-grab active:cursor-grabbing"
                >
                  <PlayIcon size={24} weight="fill" className="text-gray-600 hover:text-[#095D40]" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-900 text-white border-0 shadow-lg text-[12px] px-3 py-1.5"><p>Start</p></TooltipContent>
            </Tooltip>

            {/* Group */}
            <Tooltip side="right" sideOffset={8}>
              <TooltipTrigger asChild>
                <button
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'group')}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleNodeClick('group')}
                  className="flex items-center justify-center w-12 h-12 rounded-lg hover:bg-[#D4E5DF] transition-colors cursor-grab active:cursor-grabbing"
                >
                  <Monitor size={24} weight="duotone" className="text-gray-600 hover:text-[#095D40]" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-900 text-white border-0 shadow-lg text-[12px] px-3 py-1.5"><p>Group</p></TooltipContent>
            </Tooltip>

          </aside>
        </div>
      </TooltipProvider>

      <SocialMediaDialog
        open={socialMediaDialogOpen}
        onOpenChange={setSocialMediaDialogOpen}
        onAddNode={handleSocialMediaAdd}
      />

      <UploadMediaDialog
        open={uploadMediaDialogOpen}
        onOpenChange={setUploadMediaDialogOpen}
        mediaType={uploadNodeType}
        position={getCenterPosition()}
      />
    </>
  );
}
