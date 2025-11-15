'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Command, Instagram, Linkedin, Youtube, Camera } from 'lucide-react';
import type { NodeType } from '@/types/workflow';
import { getNodeMetadata } from '@/lib/workflow/node-registry';
import { stopCanvasPointerEvent, stopCanvasWheelEvent } from '@/lib/workflow/interaction-guards';

interface QuickAddMenuProps {
  isOpen: boolean;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onSelectNode: (type: NodeType) => void;
  onOpenSocialMediaDialog?: () => void;
}

const NODE_TYPES: NodeType[] = [
  'start',
  'pdf',
  'voice',
  'image',
  'mindmap',
  'sticky',
  'prompt',
  'linkedin-creator',
  'chat',
  'connector',
  'group',
];

export function QuickAddMenu({
  isOpen,
  position,
  onClose,
  onSelectNode,
  onOpenSocialMediaDialog,
}: QuickAddMenuProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredNodes = NODE_TYPES.map((type) => ({
    type,
    metadata: getNodeMetadata(type),
  })).filter(
    ({ type, metadata }) =>
      type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      metadata.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Reset state when menu opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredNodes.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredNodes.length) % filteredNodes.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredNodes[selectedIndex]) {
          onSelectNode(filteredNodes[selectedIndex].type);
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredNodes, selectedIndex, onSelectNode, onClose]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  const handleNodeClick = useCallback(
    (type: NodeType) => {
      onSelectNode(type);
      onClose();
    },
    [onSelectNode, onClose]
  );

  if (!isOpen || !position) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      data-flowy-interactive="true"
      onPointerDownCapture={stopCanvasPointerEvent}
      onMouseDownCapture={stopCanvasPointerEvent}
      onWheelCapture={stopCanvasWheelEvent}
      className="fixed z-[100] w-80 rounded-xl border border-[#D4AF7F]/30 bg-white shadow-xl"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div className="p-3 border-b border-[#D4AF7F]/20">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#FAFBFC] border border-[#E8ECEF]">
          <Command className="h-4 w-4 text-[#6B7280]" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search nodes..."
            className="flex-1 bg-transparent outline-none text-sm text-[#1A1D21] placeholder:text-[#9CA3AF]"
          />
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto p-1">
        {/* Social Media Group Button */}
        {onOpenSocialMediaDialog && (
          <button
            onClick={() => {
              onOpenSocialMediaDialog();
              onClose();
            }}
            className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors text-[#333333] hover:bg-[#D4AF7F]/5 mb-1"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-pink-500 via-purple-500 to-blue-600 flex-shrink-0 mt-0.5">
              <Camera className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">Social Media</div>
              <div className="text-xs text-[#6B7280] mt-0.5 flex items-center gap-1">
                <Instagram className="h-3 w-3" />
                <Linkedin className="h-3 w-3" />
                <Youtube className="h-3 w-3" />
                <span className="ml-1">Auto-detect platform</span>
              </div>
            </div>
          </button>
        )}

        {filteredNodes.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-[#6B7280]">
            No nodes found
          </div>
        ) : (
          filteredNodes.map(({ type, metadata }, index) => (
            <button
              key={type}
              onClick={() => handleNodeClick(type)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`
                w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors
                ${
                  index === selectedIndex
                    ? 'bg-[#D4AF7F]/10 text-[#095D40]'
                    : 'text-[#333333] hover:bg-[#D4AF7F]/5'
                }
              `}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0 mt-0.5"
                style={{ backgroundColor: metadata.color }}
              >
                <metadata.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{metadata.label}</div>
                <div className="text-xs text-[#6B7280] mt-0.5 line-clamp-1">
                  {metadata.description}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
