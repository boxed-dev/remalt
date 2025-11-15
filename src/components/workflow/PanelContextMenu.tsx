'use client';

import { useEffect, useRef } from 'react';
import {
  Plus,
  Play,
  Copy,
  Download,
  Upload,
  Network,
} from 'lucide-react';
import { stopCanvasPointerEvent, stopCanvasWheelEvent } from '@/lib/workflow/interaction-guards';

interface PanelContextMenuProps {
  position: { x: number; y: number } | null;
  onClose: () => void;
  onAddNode: (type: string) => void;
  onRunWorkflow: () => void;
  onPaste: () => void;
  onExport: () => void;
  onImport: () => void;
  onOrganize: () => void;
  canPaste: boolean;
}

export function PanelContextMenu({
  position,
  onClose,
  onAddNode,
  onRunWorkflow,
  onPaste,
  onExport,
  onImport,
  onOrganize,
  canPaste,
}: PanelContextMenuProps) {
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

  if (!position) return null;

  const menuItems = [
    {
      icon: <Plus className="h-4 w-4" />,
      label: 'Add Block',
      onClick: () => {
        // This will open submenu in future
        onClose();
      },
      hasSubmenu: true,
    },
    {
      icon: <Copy className="h-4 w-4" />,
      label: 'Paste',
      onClick: () => {
        onPaste();
        onClose();
      },
      disabled: !canPaste,
      shortcut: 'Cmd+V',
    },
    { type: 'divider' as const },
    {
      icon: <Play className="h-4 w-4" />,
      label: 'Run Workflow',
      onClick: () => {
        onRunWorkflow();
        onClose();
      },
      shortcut: 'Alt+R',
    },
    { type: 'divider' as const },
    {
      icon: <Download className="h-4 w-4" />,
      label: 'Export Image',
      onClick: () => {
        onExport();
        onClose();
      },
    },
    {
      icon: <Upload className="h-4 w-4" />,
      label: 'Import DSL',
      onClick: () => {
        onImport();
        onClose();
      },
    },
    { type: 'divider' as const },
    {
      icon: <Network className="h-4 w-4" />,
      label: 'Organize Blocks',
      onClick: () => {
        onOrganize();
        onClose();
      },
      shortcut: 'Cmd+O',
    },
  ];

  return (
    <div
      ref={menuRef}
      data-flowy-interactive="true"
      onMouseDownCapture={stopCanvasPointerEvent}
      onPointerDownCapture={stopCanvasPointerEvent}
      onWheelCapture={stopCanvasWheelEvent}
      className="fixed z-[100] w-56 rounded-lg border border-[#D4AF7F]/30 bg-white shadow-xl"
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
              disabled={item.disabled}
              className={`
                w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors
                ${
                  item.disabled
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-[#D4AF7F]/10 text-[#333333] hover:text-[#095D40] cursor-pointer'
                }
              `}
            >
              <span className="text-[#6B7280]">{item.icon}</span>
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
