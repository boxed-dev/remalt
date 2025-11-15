'use client';

import { useEffect, useRef } from 'react';
import {
  Copy,
  FolderPlus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyCenter,
  Trash2,
  MoveHorizontal,
  MoveVertical,
} from 'lucide-react';
import { stopCanvasPointerEvent, stopCanvasWheelEvent } from '@/lib/workflow/interaction-guards';

interface SelectionContextMenuProps {
  position: { x: number; y: number } | null;
  selectedNodeIds: string[];
  onClose: () => void;
  onCopy: () => void;
  onGroup: () => void;
  onAlign: (direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  onDistribute: (direction: 'horizontal' | 'vertical') => void;
  onDelete: () => void;
}

export function SelectionContextMenu({
  position,
  selectedNodeIds,
  onClose,
  onCopy,
  onGroup,
  onAlign,
  onDistribute,
  onDelete,
}: SelectionContextMenuProps) {
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

  if (!position || selectedNodeIds.length < 2) return null;

  const menuItems = [
    {
      icon: <Copy className="h-4 w-4" />,
      label: 'Copy Selection',
      onClick: () => {
        onCopy();
        onClose();
      },
    },
    {
      icon: <FolderPlus className="h-4 w-4" />,
      label: 'Group Nodes',
      onClick: () => {
        onGroup();
        onClose();
      },
    },
    { type: 'divider' as const },
    {
      icon: <AlignLeft className="h-4 w-4" />,
      label: 'Align',
      hasSubmenu: true,
      submenu: [
        {
          icon: <AlignLeft className="h-3 w-3" />,
          label: 'Left',
          onClick: () => {
            onAlign('left');
            onClose();
          },
        },
        {
          icon: <AlignCenter className="h-3 w-3" />,
          label: 'Center',
          onClick: () => {
            onAlign('center');
            onClose();
          },
        },
        {
          icon: <AlignRight className="h-3 w-3" />,
          label: 'Right',
          onClick: () => {
            onAlign('right');
            onClose();
          },
        },
        { type: 'divider' as const },
        {
          icon: <AlignLeft className="h-3 w-3 rotate-90" />,
          label: 'Top',
          onClick: () => {
            onAlign('top');
            onClose();
          },
        },
        {
          icon: <AlignVerticalJustifyCenter className="h-3 w-3" />,
          label: 'Middle',
          onClick: () => {
            onAlign('middle');
            onClose();
          },
        },
        {
          icon: <AlignLeft className="h-3 w-3 rotate-90" />,
          label: 'Bottom',
          onClick: () => {
            onAlign('bottom');
            onClose();
          },
        },
      ],
    },
    {
      icon: <MoveHorizontal className="h-4 w-4" />,
      label: 'Distribute',
      hasSubmenu: true,
      submenu: [
        {
          icon: <MoveHorizontal className="h-3 w-3" />,
          label: 'Horizontally',
          onClick: () => {
            onDistribute('horizontal');
            onClose();
          },
        },
        {
          icon: <MoveVertical className="h-3 w-3" />,
          label: 'Vertically',
          onClick: () => {
            onDistribute('vertical');
            onClose();
          },
        },
      ],
    },
    { type: 'divider' as const },
    {
      icon: <Trash2 className="h-4 w-4" />,
      label: `Delete ${selectedNodeIds.length} Nodes`,
      onClick: () => {
        onDelete();
        onClose();
      },
      danger: true,
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

          if (item.hasSubmenu) {
            return (
              <div key={item.label} className="relative group">
                <button
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors hover:bg-[#D4AF7F]/10 text-[#333333] hover:text-[#095D40] cursor-pointer"
                >
                  <span className="text-[#6B7280]">{item.icon}</span>
                  <span className="flex-1 text-left">{item.label}</span>
                  <span className="text-[#9CA3AF]">→</span>
                </button>
                {/* Submenu */}
                <div className="absolute left-full top-0 ml-1 hidden group-hover:block w-44 rounded-lg border border-[#D4AF7F]/30 bg-white shadow-xl p-1 z-[101]">
                  {item.submenu?.map((subItem, subIndex) => {
                    if (subItem.type === 'divider') {
                      return (
                        <div
                          key={`sub-divider-${subIndex}`}
                          className="my-1 h-px bg-[#D4AF7F]/20"
                        />
                      );
                    }
                    return (
                      <button
                        key={subItem.label}
                        onClick={subItem.onClick}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors hover:bg-[#D4AF7F]/10 text-[#333333] hover:text-[#095D40] cursor-pointer"
                      >
                        <span className="text-[#6B7280]">{subItem.icon}</span>
                        <span>{subItem.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
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
            </button>
          );
        })}
      </div>
    </div>
  );
}
