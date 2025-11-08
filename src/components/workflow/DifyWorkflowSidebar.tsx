'use client';

import { useState } from 'react';
import {
  FileText,
  Microphone,
  YoutubeLogo,
  Image,
  InstagramLogo,
  LinkedinLogo,
  TextT,
  Globe,
  ChatCircle,
  Folder,
} from '@phosphor-icons/react';
import type { NodeType } from '@/types/workflow';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { SocialMediaDialog } from './SocialMediaDialog';
import { UploadMediaDialog } from './UploadMediaDialog';

interface NodeItem {
  id: NodeType;
  icon: React.ReactNode;
  label: string;
  category: 'media' | 'content' | 'ai' | 'structure';
  subcategory?: 'social';
  iconBgColor?: string;
  shortcut?: string;
}

const NODES: NodeItem[] = [
  // Media
  { id: 'pdf', icon: <FileText size={24} weight="duotone" />, label: 'PDF / Document', category: 'media', shortcut: 'P' },
  { id: 'voice', icon: <Microphone size={24} weight="duotone" />, label: 'Voice Note', category: 'media', shortcut: 'V' },
  { id: 'youtube', icon: <YoutubeLogo size={24} weight="duotone" />, label: 'YouTube Video', category: 'media', subcategory: 'social', shortcut: 'Y' },
  { id: 'instagram', icon: <InstagramLogo size={24} weight="duotone" />, label: 'Instagram', category: 'media', subcategory: 'social', shortcut: 'I' },
  { id: 'linkedin', icon: <LinkedinLogo size={24} weight="duotone" />, label: 'LinkedIn', category: 'media', subcategory: 'social', shortcut: 'L' },
  { id: 'image', icon: <Image size={24} weight="duotone" />, label: 'Image', category: 'media', shortcut: 'M' },
  { id: 'webpage', icon: <Globe size={24} weight="duotone" />, label: 'Webpage / URL', category: 'media', subcategory: 'social', shortcut: 'W' },

  // Content
  { id: 'text', icon: <TextT size={24} weight="regular" />, label: 'Text / Note', category: 'content', shortcut: 'T' },

  // AI
  { id: 'linkedin-creator', icon: <LinkedinLogo size={24} weight="duotone" />, label: 'LinkedIn Post Creator', category: 'ai', shortcut: 'N' },
  { id: 'chat', icon: <ChatCircle size={24} weight="duotone" />, label: 'Chat / Assistant', category: 'ai', shortcut: 'C' },
  // Structure
  { id: 'group', icon: <Folder size={24} weight="duotone" />, label: 'Group', category: 'structure', shortcut: 'G' },
];

export function DifyWorkflowSidebar() {
  const addNode = useWorkflowStore((state) => state.addNode);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const workflow = useWorkflowStore((state) => state.workflow);
  const [draggedNode, setDraggedNode] = useState<NodeType | null>(null);
  const [socialMediaDialogOpen, setSocialMediaDialogOpen] = useState(false);
  const [uploadMediaDialogOpen, setUploadMediaDialogOpen] = useState(false);
  const [uploadNodeType, setUploadNodeType] = useState<'image' | 'pdf'>('image');

  // Calculate center position for uploaded nodes
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
    console.log('🎯 Drag started for:', nodeType);
    setDraggedNode(nodeType);
    e.dataTransfer.setData('application/reactflow', nodeType);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    console.log('🎯 Drag ended');
    // Small delay to ensure drag completes before allowing click
    setTimeout(() => setDraggedNode(null), 100);
  };

  const handleNodeClick = (e: React.MouseEvent, nodeType: NodeType) => {
    // Don't trigger if we just dragged
    if (draggedNode) {
      console.log('⏭️ Skipping click - drag in progress');
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    console.log('🖱️ Node clicked:', nodeType);

    // Open upload dialog for image and pdf nodes
    if (nodeType === 'image' || nodeType === 'pdf') {
      setUploadNodeType(nodeType);
      setUploadMediaDialogOpen(true);
      return;
    }

    // Calculate center of current viewport
    const viewport = workflow?.viewport || { x: 0, y: 0, zoom: 1 };

    // Get window center in screen coordinates
    const windowCenterX = window.innerWidth / 2;
    const windowCenterY = window.innerHeight / 2;

    // Convert to flow coordinates accounting for viewport transform
    const centerPosition = {
      x: (windowCenterX - viewport.x) / viewport.zoom,
      y: (windowCenterY - viewport.y) / viewport.zoom - 100, // Offset for header
    };

    console.log('📍 Adding node at viewport center:', centerPosition, 'viewport:', viewport);

    const newNode = addNode(nodeType, centerPosition);

    console.log('✅ Node created:', newNode);
  };

  const handleSocialMediaAdd = (type: 'instagram' | 'linkedin' | 'youtube' | 'webpage', url: string) => {
    // Calculate center of current viewport
    const viewport = workflow?.viewport || { x: 0, y: 0, zoom: 1 };
    const windowCenterX = window.innerWidth / 2;
    const windowCenterY = window.innerHeight / 2;
    const centerPosition = {
      x: (windowCenterX - viewport.x) / viewport.zoom,
      y: (windowCenterY - viewport.y) / viewport.zoom - 100,
    };

    // Add the node with the URL pre-filled
    const newNode = addNode(type, centerPosition);

    // Update the node data with the URL
    if (type === 'instagram') {
      updateNodeData(newNode.id, { url });
    } else if (type === 'linkedin') {
      updateNodeData(newNode.id, { url });
    } else if (type === 'youtube') {
      updateNodeData(newNode.id, { url });
    } else if (type === 'webpage') {
      updateNodeData(newNode.id, { url });
    }
  };

  return (
    <>
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex items-center pointer-events-none">
        {/* Sidebar without scroll */}
        <aside className="bg-white rounded-xl shadow-lg border border-gray-200/80 overflow-hidden py-1 pointer-events-auto w-12">
          <div className="flex flex-col">
            {/* Social Media Compact 2x2 Grid in Collapsed View - At the top */}
            {NODES.some(node => node.subcategory === 'social') && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSocialMediaDialogOpen(true);
                }}
                className="peer/social relative flex items-stretch w-12 h-12 justify-center items-center group overflow-hidden"
                title="Social Media"
              >
                <div className="flex items-center justify-center flex-col gap-0.5 group-hover:scale-105 transition-transform">
                  <div className="flex flex-row gap-0.5">
                    <div className="p-0.5 bg-gray-100 rounded group-hover:bg-[#B8D5C9] transition-colors">
                      <YoutubeLogo size={13} weight="fill" className="text-gray-600 group-hover:text-[#095D40]" />
                    </div>
                    <div className="p-0.5 bg-gray-100 rounded group-hover:bg-[#B8D5C9] transition-colors">
                      <InstagramLogo size={13} weight="fill" className="text-gray-600 group-hover:text-[#095D40]" />
                    </div>
                  </div>
                  <div className="flex flex-row gap-0.5">
                    <div className="p-0.5 bg-gray-100 rounded group-hover:bg-[#B8D5C9] transition-colors">
                      <LinkedinLogo size={13} weight="fill" className="text-gray-600 group-hover:text-[#095D40]" />
                    </div>
                    <div className="p-0.5 bg-gray-100 rounded group-hover:bg-[#B8D5C9] transition-colors">
                      <Globe size={13} weight="fill" className="text-gray-600 group-hover:text-[#095D40]" />
                    </div>
                  </div>
                </div>
              </button>
            )}

            {NODES.filter(node => node.subcategory !== 'social').map((node) => (
              <button
                key={node.id}
                draggable
                onDragStart={(e) => handleDragStart(e, node.id)}
                onDragEnd={handleDragEnd}
                onClick={(e) => handleNodeClick(e, node.id)}
                className={`peer/${node.id} relative flex items-stretch w-12 h-12 justify-center p-1 group`}
                title={node.label}
              >
                <div className="rounded-lg p-[2px] flex-1 flex items-center justify-center flex-col gap-[2px] group-hover:border-[#D4E5DF] group-hover:bg-[#D4E5DF] transition-colors">
                  <div className="text-gray-600 group-hover:text-[#095D40] transition-colors">
                    {node.icon}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Tooltips container - outside the scrollable area */}
        <div className="absolute left-full ml-2 top-0 pointer-events-none">
          {/* Social Media Tooltip */}
          {NODES.some(node => node.subcategory === 'social') && (
            <div className="absolute peer-hover/social:opacity-100 opacity-0 transition-opacity px-3 py-2 bg-white rounded-lg shadow-lg border border-gray-200 whitespace-nowrap z-[100] flex items-center gap-2" style={{ top: '4px' }}>
              <span className="text-sm font-medium text-gray-900">Socials</span>
              <span className="text-xs font-medium text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                S
              </span>
            </div>
          )}

          {/* Individual Node Tooltips */}
          {NODES.filter(node => node.subcategory !== 'social').map((node, index) => {
            const offset = NODES.some(n => n.subcategory === 'social') ? 1 : 0;
            const topPosition = (index + offset) * 48 + 4;
            return (
              <div
                key={node.id}
                className={`absolute peer-hover/${node.id}:opacity-100 opacity-0 transition-opacity px-3 py-2 bg-white rounded-lg shadow-lg border border-gray-200 whitespace-nowrap z-[100] flex items-center gap-2`}
                style={{ top: `${topPosition}px` }}
              >
                <span className="text-sm font-medium text-gray-900">{node.label}</span>
                {node.shortcut && (
                  <span className="text-xs font-medium text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                    {node.shortcut}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

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
