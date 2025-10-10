'use client';

import { useState } from 'react';
import {
  FileText,
  Mic,
  Video,
  Image as ImageIcon,
  Instagram,
  Linkedin,
  Type,
  Lightbulb,
  FileCode,
  Globe,
  MessageSquare,
  Link,
  Group as GroupIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { NodeType } from '@/types/workflow';
import { useWorkflowStore } from '@/lib/stores/workflow-store';

interface NodeItem {
  id: NodeType;
  icon: React.ReactNode;
  label: string;
  category: 'media' | 'content' | 'ai' | 'structure';
  iconBgColor?: string;
}

const NODES: NodeItem[] = [
  // Media
  { id: 'pdf', icon: <FileText className="h-6 w-6" />, label: 'PDF / Document', category: 'media' },
  { id: 'voice', icon: <Mic className="h-6 w-6" />, label: 'Voice Note', category: 'media' },
  { id: 'youtube', icon: <Video className="h-6 w-6" />, label: 'YouTube Video', category: 'media' },
  { id: 'instagram', icon: <Instagram className="h-6 w-6" />, label: 'Instagram', category: 'media' },
  { id: 'linkedin', icon: <Linkedin className="h-6 w-6" />, label: 'LinkedIn', category: 'media' },
  { id: 'image', icon: <ImageIcon className="h-6 w-6" />, label: 'Image', category: 'media' },
  { id: 'webpage', icon: <Globe className="h-6 w-6" />, label: 'Webpage / URL', category: 'media' },

  // Content
  { id: 'text', icon: <Type className="h-6 w-6" />, label: 'Text / Note', category: 'content' },
  { id: 'mindmap', icon: <Lightbulb className="h-6 w-6" />, label: 'Mind Map / Idea', category: 'content' },

  // AI
  { id: 'chat', icon: <MessageSquare className="h-6 w-6" />, label: 'Chat / Assistant', category: 'ai' },

  // Structure
  { id: 'group', icon: <GroupIcon className="h-6 w-6" />, label: 'Group', category: 'structure' },
];

const CATEGORIES = [
  { id: 'media', label: 'Media' },
  { id: 'content', label: 'Content' },
  { id: 'ai', label: 'AI' },
  { id: 'structure', label: 'Structure' },
] as const;

export function DifyWorkflowSidebar() {
  const addNode = useWorkflowStore((state) => state.addNode);
  const workflow = useWorkflowStore((state) => state.workflow);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['media', 'content', 'ai', 'structure'])
  );
  const [draggedNode, setDraggedNode] = useState<NodeType | null>(null);

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

  return (
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
            <ChevronRight className="h-4 w-4 text-gray-600" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-3 px-2 max-h-[calc(100vh-120px)]">
        {isCollapsed ? (
          // Collapsed view - only icons
          <div className="space-y-2">
            {NODES.map((node) => (
              <div
                key={node.id}
                draggable
                onDragStart={(e) => handleDragStart(e, node.id)}
                onDragEnd={handleDragEnd}
                onClick={(e) => handleNodeClick(e, node.id)}
                className="flex items-center justify-center p-2 rounded-lg cursor-pointer transition-all select-none hover:bg-gray-50"
                title={node.label}
              >
                <div className={`w-8 h-8 flex items-center justify-center flex-shrink-0`}>
                  <div className="text-gray-700">
                    {node.icon}
                  </div>
                </div>
              </div>
            ))}
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
                    {categoryNodes.map((node) => (
                      <div
                        key={node.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, node.id)}
                        onDragEnd={handleDragEnd}
                        onClick={(e) => handleNodeClick(e, node.id)}
                        className="flex items-center gap-3 px-2 py-1.5 rounded-lg cursor-pointer transition-all select-none hover:bg-gray-50"
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${node.iconBgColor || 'bg-gray-100'}`}>
                          <div className="text-gray-700">
                            {node.icon}
                          </div>
                        </div>
                        <span className="text-[13px] font-medium text-gray-700">
                          {node.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
