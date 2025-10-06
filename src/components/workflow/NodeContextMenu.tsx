'use client';

import { useEffect, useRef } from 'react';
import {
  Copy,
  Layers,
  Trash2,
  StickyNote,
  HelpCircle,
  FolderPlus,
} from 'lucide-react';

interface NodeContextMenuProps {
  position: { x: number; y: number } | null;
  nodeId: string | null;
  onClose: () => void;
  onCopy: (nodeId: string) => void;
  onDuplicate: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onAddToGroup: (nodeId: string) => void;
  onAddNote: () => void;
  onHelp: () => void;
}

export function NodeContextMenu({
  position,
  nodeId,
  onClose,
  onCopy,
  onDuplicate,
  onDelete,
  onAddToGroup,
  onAddNote,
  onHelp,
}: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  if (!position || !nodeId) return null;

  const menuItems = [
    {
      icon: <Copy className="h-4 w-4" />,
      label: 'Copy',
      onClick: () => {
        onCopy(nodeId);
        onClose();
      },
      shortcut: 'Cmd+C',
    },
    {
      icon: <Layers className="h-4 w-4" />,
      label: 'Duplicate',
      onClick: () => {
        onDuplicate(nodeId);
        onClose();
      },
      shortcut: 'Cmd+D',
    },
    {
      icon: <Trash2 className="h-4 w-4" />,
      label: 'Delete',
      onClick: () => {
        onDelete(nodeId);
        onClose();
      },
      shortcut: '⌫',
      danger: true,
    },
    { type: 'divider' as const },
    {
      icon: <FolderPlus className="h-4 w-4" />,
      label: 'Add to Group',
      onClick: () => {
        onAddToGroup(nodeId);
        onClose();
      },
      hasSubmenu: true,
    },
    {
      icon: <StickyNote className="h-4 w-4" />,
      label: 'Add Note',
      onClick: () => {
        onAddNote();
        onClose();
      },
    },
    { type: 'divider' as const },
    {
      icon: <HelpCircle className="h-4 w-4" />,
      label: 'Help & Docs',
      onClick: () => {
        onHelp();
        onClose();
      },
    },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] w-52 rounded-lg border border-[#D4AF7F]/30 bg-white shadow-xl"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div className="p-1">
        {menuItems.map((item, index) => {
          if (item.type === 'divider') {
            return (
              <div
                key={`divider-${index}`}
                className="my-1 h-px bg-[#D4AF7F]/20"
              />
            );
          }

          return (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`
                w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors
                ${
                  item.danger
                    ? 'hover:bg-red-50 text-red-600 hover:text-red-700'
                    : 'hover:bg-[#D4AF7F]/10 text-[#333333] hover:text-[#095D40]'
                }
                cursor-pointer
              `}
            >
              <span className={item.danger ? 'text-red-500' : 'text-[#6B7280]'}>
                {item.icon}
              </span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.shortcut && (
                <span className="text-xs text-[#9CA3AF]">{item.shortcut}</span>
              )}
              {item.hasSubmenu && (
                <span className="text-[#9CA3AF]">→</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
