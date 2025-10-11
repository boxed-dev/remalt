'use client';

import { useState } from 'react';
import {
  FileText,
  Microphone,
  VideoCamera,
  YoutubeLogo,
  Image,
  InstagramLogo,
  LinkedinLogo,
  TextT,
  Lightbulb,
  Globe,
  ChatCircle,
  UsersThree,
  CaretLeft,
  CaretRight,
  Plus,
  Folder,
} from '@phosphor-icons/react';
import type { NodeType } from '@/types/workflow';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { SocialMediaDialog } from './SocialMediaDialog';

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
  { id: 'mindmap', icon: <Lightbulb size={24} weight="regular" />, label: 'Mind Map / Idea', category: 'content', shortcut: 'B' },

  // AI
  { id: 'chat', icon: <ChatCircle size={24} weight="duotone" />, label: 'Chat / Assistant', category: 'ai', shortcut: 'C' },
  // Structure
  { id: 'group', icon: <Folder size={24} weight="duotone" />, label: 'Group', category: 'structure', shortcut: 'G' },
];

const CATEGORIES = [
  { id: 'media', label: 'Media' },
  { id: 'content', label: 'Content' },
  { id: 'ai', label: 'AI' },
  { id: 'structure', label: 'Structure' },
] as const;

export function DifyWorkflowSidebar() {
  const addNode = useWorkflowStore((state) => state.addNode);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const workflow = useWorkflowStore((state) => state.workflow);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['media', 'content', 'ai', 'structure'])
  );
  const [draggedNode, setDraggedNode] = useState<NodeType | null>(null);
  const [socialMediaDialogOpen, setSocialMediaDialogOpen] = useState(false);

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
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
      <aside className={`absolute left-4 top-4 z-10 bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col overflow-hidden pointer-events-auto transition-all ${isCollapsed ? 'w-14' : 'w-64'}`}>
        {/* Header with collapse button */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
          {!isCollapsed && <span className="text-[13px] font-semibold text-gray-700">Add Nodes</span>}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 hover:bg-gray-100 rounded transition-colors ml-auto"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <CaretRight size={16} weight="bold" className="text-gray-600" />
            ) : (
              <CaretLeft size={16} weight="bold" className="text-gray-600" />
            )}
          </button>
        </div>

      <div className="flex-1 overflow-y-auto py-3 px-2 max-h-[calc(100vh-120px)]">
        {isCollapsed ? (
          // Collapsed view - only icons
          <div className="space-y-2">
            {NODES.filter(node => node.subcategory !== 'social').map((node) => (
              <div
                key={node.id}
                draggable
                onDragStart={(e) => handleDragStart(e, node.id)}
                onDragEnd={handleDragEnd}
                onClick={(e) => handleNodeClick(e, node.id)}
                className="relative flex items-center justify-center p-2 rounded-lg cursor-pointer transition-colors select-none hover:bg-emerald-50 group"
                title={node.label}
              >
                <div className={`w-8 h-8 flex items-center justify-center flex-shrink-0 bg-gray-50 rounded-lg`}>
                  <div className="text-gray-700">
                    {node.icon}
                  </div>
                </div>
                {/* Tooltip with keyboard shortcut */}
                <div className="absolute left-full ml-2 px-3 py-2 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{node.label}</span>
                  {node.shortcut && (
                    <span className="text-xs font-medium text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                      {node.shortcut}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* Social Media Compact 2x2 Grid in Collapsed View */}
            {NODES.some(node => node.subcategory === 'social') && (
              <div className="relative flex items-center justify-center p-2 rounded-lg cursor-pointer transition-colors select-none hover:bg-emerald-50 group">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSocialMediaDialogOpen(true);
                  }}
                  className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-lg"
                  title="Social Media"
                >
                  <div className="grid grid-cols-2 gap-1">
                    <div className="w-3.5 h-3.5 flex items-center justify-center bg-white rounded-sm">
                      <YoutubeLogo size={10} weight="fill" className="text-gray-600" />
                    </div>
                    <div className="w-3.5 h-3.5 flex items-center justify-center bg-white rounded-sm">
                      <InstagramLogo size={10} weight="fill" className="text-gray-600" />
                    </div>
                    <div className="w-3.5 h-3.5 flex items-center justify-center bg-white rounded-sm">
                      <LinkedinLogo size={10} weight="fill" className="text-gray-600" />
                    </div>
                    <div className="w-3.5 h-3.5 flex items-center justify-center bg-white rounded-sm">
                      <Globe size={10} weight="fill" className="text-gray-600" />
                    </div>
                  </div>
                </button>
                {/* Tooltip */}
                <div className="absolute left-full ml-2 px-3 py-2 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">Socials</span>
                  <span className="text-xs font-medium text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                    S
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Expanded view - categories with labels
          CATEGORIES.map((category) => {
            const categoryNodes = NODES.filter((node) => node.category === category.id);
            const isExpanded = expandedCategories.has(category.id);

            return (
              <div key={category.id} className="mb-2">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center justify-between px-2 py-1 hover:bg-gray-50 transition-colors text-left rounded"
                >
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    {category.label}
                  </span>
                  <svg
                    className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Category Nodes */}
                {isExpanded && (
                  <div className="mt-1 space-y-1">
                    {(() => {
                      const socialNodes = categoryNodes.filter(node => node.subcategory === 'social');
                      const regularNodes = categoryNodes.filter(node => node.subcategory !== 'social');
                      const hasSocialNodes = socialNodes.length > 0;

                      return (
                        <>
                          {/* Render regular nodes first */}
                          {regularNodes.map((node) => (
                            <div
                              key={node.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, node.id)}
                              onDragEnd={handleDragEnd}
                              onClick={(e) => handleNodeClick(e, node.id)}
                              className="flex items-center gap-3 px-2 py-1.5 rounded-lg cursor-pointer transition-colors select-none hover:bg-emerald-50"
                            >
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${node.iconBgColor || 'bg-gray-50'}`}>
                                <div className="text-gray-700">
                                  {node.icon}
                                </div>
                              </div>
                              <span className="text-[13px] font-medium text-gray-700">
                                {node.label}
                              </span>
                            </div>
                          ))}

                          {/* Render social media compact 2x2 grid if category has social nodes */}
                          {hasSocialNodes && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSocialMediaDialogOpen(true);
                              }}
                              className="flex items-center gap-3 px-2 py-1.5 rounded-lg cursor-pointer transition-colors select-none hover:bg-emerald-50 w-full"
                            >
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-50">
                                <div className="rounded-lg p-[3px] border border-gray-200 group-hover:border-indigo-100 transition-colors">
                                  <div className="flex flex-col gap-[2px]">
                                    {/* Top row: YouTube, Instagram */}
                                    <div className="flex gap-[2px] justify-center">
                                      <div className="p-[2px] bg-white rounded-full group-hover:bg-indigo-100 transition-colors">
                                        <YoutubeLogo size={6} weight="fill" className="text-gray-600 group-hover:text-red-600 transition-colors" />
                                      </div>
                                      <div className="p-[2px] bg-white rounded-full group-hover:bg-indigo-100 transition-colors">
                                        <InstagramLogo size={6} weight="fill" className="text-gray-600 group-hover:text-pink-600 transition-colors" />
                                      </div>
                                    </div>
                                    {/* Bottom row: LinkedIn, Webpage */}
                                    <div className="flex gap-[2px] justify-center">
                                      <div className="p-[2px] bg-white rounded-full group-hover:bg-indigo-100 transition-colors">
                                        <LinkedinLogo size={6} weight="fill" className="text-gray-600 group-hover:text-blue-600 transition-colors" />
                                      </div>
                                      <div className="p-[2px] bg-white rounded-full group-hover:bg-indigo-100 transition-colors">
                                        <Globe size={6} weight="fill" className="text-gray-600 group-hover:text-gray-700 transition-colors" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <span className="text-[13px] font-medium text-gray-700">
                                Socials
                              </span>
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>

    <SocialMediaDialog
      open={socialMediaDialogOpen}
      onOpenChange={setSocialMediaDialogOpen}
      onAddNode={handleSocialMediaAdd}
    />
    </>
  );
}
