'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Command } from 'lucide-react';
import type { NodeType } from '@/types/workflow';
import { getNodeMetadata } from '@/lib/workflow/node-registry';

interface QuickAddMenuProps {
  isOpen: boolean;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onSelectNode: (type: NodeType) => void;
}

const NODE_TYPES: NodeType[] = [
  'pdf',
  'voice',
  'youtube',
  'image',
  'webpage',
  'text',
  'mindmap',
  'template',
  'chat',
  'connector',
  'group',
];

export function QuickAddMenu({
  isOpen,
  position,
  onClose,
  onSelectNode,
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
      className="fixed z-[100] w-80 rounded-lg border border-[#D4AF7F]/30 bg-white shadow-xl"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div className="p-3 border-b border-[#D4AF7F]/20">
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#FAFBFC] border border-[#E8ECEF]">
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
                w-full flex items-start gap-3 px-3 py-2.5 rounded-md text-left transition-colors
                ${
                  index === selectedIndex
                    ? 'bg-[#D4AF7F]/10 text-[#095D40]'
                    : 'text-[#333333] hover:bg-[#D4AF7F]/5'
                }
              `}
            >
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center text-white flex-shrink-0 mt-0.5"
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

      <div className="px-3 py-2 border-t border-[#D4AF7F]/20 text-xs text-[#6B7280] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-[#E8ECEF] text-[#6B7280] font-mono text-[10px]">
              ↑↓
            </kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-[#E8ECEF] text-[#6B7280] font-mono text-[10px]">
              ↵
            </kbd>
            Select
          </span>
        </div>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-[#E8ECEF] text-[#6B7280] font-mono text-[10px]">
            Esc
          </kbd>
          Close
        </span>
      </div>
    </div>
  );
}
