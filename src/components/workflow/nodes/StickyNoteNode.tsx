'use client';

import { memo, useState } from 'react';
import { StickyNote, X, Palette } from 'lucide-react';
import { Handle, Position } from '@xyflow/react';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { NovelEditor } from '../NovelEditor';
import type { NodeProps } from '@xyflow/react';
import type { StickyNoteData } from '@/types/workflow';

// Predefined sticky note colors
const STICKY_COLORS = [
  { bg: '#FEF3C7', label: 'Yellow' }, // Default yellow
  { bg: '#FED7AA', label: 'Orange' },
  { bg: '#FECACA', label: 'Red' },
  { bg: '#DDD6FE', label: 'Purple' },
  { bg: '#BFDBFE', label: 'Blue' },
  { bg: '#BBF7D0', label: 'Green' },
  { bg: '#E5E7EB', label: 'Gray' },
  { bg: '#FBCFE8', label: 'Pink' },
];

export const StickyNoteNode = memo(({ id, data, parentId }: NodeProps<StickyNoteData>) => {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const deleteNode = useWorkflowStore((state) => state.deleteNode);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleContentChange = (content: string) => {
    updateNodeData(id, {
      content,
    } as Partial<StickyNoteData>);
  };

  const handleColorChange = (color: string) => {
    updateNodeData(id, {
      backgroundColor: color,
    } as Partial<StickyNoteData>);
    setShowColorPicker(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNode(id);
  };

  // Get the background color or use default
  const bgColor = data.backgroundColor || '#FEF3C7';
  const textColor = data.textColor || '#1F2937';

  return (
    <div
      className="relative rounded-2xl transition-all duration-200 ease-in-out"
      style={{
        width: '320px',
        minHeight: '240px',
        backgroundColor: bgColor,
        // Add subtle shadow and slight rotation for sticky note effect
        boxShadow: isHovered
          ? '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        transform: isHovered ? 'rotate(0deg) scale(1.02)' : 'rotate(-1deg) scale(1)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowColorPicker(false);
      }}
    >
        {/* Top Controls - Only show on hover */}
        <div
          className={`absolute top-2 right-2 flex items-center gap-1 transition-opacity duration-200 ${
            isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Color Picker Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowColorPicker(!showColorPicker);
            }}
            className="p-1.5 rounded hover:bg-black/5 transition-colors"
            aria-label="Change color"
          >
            <Palette size={14} style={{ color: textColor }} />
          </button>

          {/* Delete Button */}
          <button
            onClick={handleDelete}
            className="p-1.5 rounded hover:bg-black/5 transition-colors"
            aria-label="Delete note"
          >
            <X size={14} style={{ color: textColor }} />
          </button>
        </div>

        {/* Color Picker Dropdown */}
        {showColorPicker && (
          <div className="absolute top-10 right-2 bg-white rounded-lg shadow-lg p-2 z-50">
            <div className="grid grid-cols-4 gap-1">
              {STICKY_COLORS.map((color) => (
                <button
                  key={color.bg}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleColorChange(color.bg);
                  }}
                  className={`w-7 h-7 rounded border-2 transition-all hover:scale-110 ${
                    bgColor === color.bg ? 'border-gray-800' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color.bg }}
                  title={color.label}
                />
              ))}
            </div>
          </div>
        )}

        {/* Sticky Note Icon in corner */}
        <div className="absolute top-2 left-2 opacity-50">
          <StickyNote size={16} style={{ color: textColor }} />
        </div>

      {/* Content Editor */}
      <div className="pt-8 px-3 pb-3">
        <div className="sticky-note-editor">
          <NovelEditor
            content={data.content}
            onChange={handleContentChange}
            editable={!data.disabled}
            minimal={true}
          />
        </div>
      </div>

      {/* Custom styles for sticky note editor */}
      <style jsx global>{`
        .sticky-note-editor .tiptap {
          min-height: 180px;
          padding: 0;
          background: transparent;
        }

        .sticky-note-editor .tiptap:focus {
          outline: none;
        }

        .sticky-note-editor .tiptap p {
          font-size: 14px;
          line-height: 1.5;
          color: ${textColor};
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .sticky-note-editor .tiptap h1,
        .sticky-note-editor .tiptap h2,
        .sticky-note-editor .tiptap h3 {
          color: ${textColor};
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-weight: 700;
        }

        .sticky-note-editor .tiptap h1 { font-size: 20px; margin: 8px 0; }
        .sticky-note-editor .tiptap h2 { font-size: 18px; margin: 6px 0; }
        .sticky-note-editor .tiptap h3 { font-size: 16px; margin: 4px 0; }

        .sticky-note-editor .tiptap ul,
        .sticky-note-editor .tiptap ol {
          padding-left: 20px;
          margin: 4px 0;
        }

        .sticky-note-editor .tiptap li {
          font-size: 14px;
          color: ${textColor};
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .sticky-note-editor .tiptap blockquote {
          border-left: 3px solid ${textColor}40;
          padding-left: 10px;
          margin: 8px 0;
          font-style: italic;
        }

        .sticky-note-editor .tiptap code {
          background-color: ${textColor}10;
          padding: 2px 4px;
          border-radius: 3px;
          font-size: 13px;
        }

        .sticky-note-editor .tiptap pre {
          background-color: ${textColor}10;
          padding: 8px;
          border-radius: 4px;
          overflow-x: auto;
        }

        /* Hide the placeholder when empty in sticky notes */
        .sticky-note-editor .tiptap .is-empty::before {
          content: "Type your note...";
          color: ${textColor}60;
          pointer-events: none;
          float: left;
          height: 0;
        }
      `}</style>

      {/* Handles for connections - hidden for sticky notes since they don't typically connect */}
      {!parentId && (
        <>
          <Handle
            type="target"
            position={Position.Left}
            className="!opacity-0"
            style={{ left: '-8px' }}
          />
          <Handle
            type="source"
            position={Position.Right}
            className="!opacity-0"
            style={{ right: '-8px' }}
          />
        </>
      )}
    </div>
  );
});

StickyNoteNode.displayName = 'StickyNoteNode';