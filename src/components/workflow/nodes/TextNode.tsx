'use client';

import { memo, useState, useEffect, useCallback } from 'react';
import { Type } from 'lucide-react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { NovelEditor } from '../NovelEditor';
import { FloatingAIInstructions } from './FloatingAIInstructions';
import type { TextNodeData } from '@/types/workflow';

const TEXT_NODE_DEFAULT_WIDTH = 560;
const TEXT_NODE_DEFAULT_HEIGHT = 400;
const TEXT_NODE_MIN_WIDTH = 300;
const TEXT_NODE_MIN_HEIGHT = 200;
const TEXT_NODE_MAX_WIDTH = 1200;
const TEXT_NODE_MAX_HEIGHT = 1000;

export const TextNode = memo(({ 
  id, 
  data, 
  parentId,
  selected,
  width: nodeWidth,
  height: nodeHeight,
  style: nodeStyle,
}: NodeProps<TextNodeData>) => {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const updateNode = useWorkflowStore((state) => state.updateNode);
  const activeNodeId = useWorkflowStore((state) => state.activeNodeId);
  const setActiveNode = useWorkflowStore((state) => state.setActiveNode);
  const isActive = activeNodeId === id;
  const [wordCount, setWordCount] = useState(data.wordCount || 0);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    setWordCount(data.wordCount || 0);
  }, [data.wordCount]);

  const handleContentChange = (content: string, plainText: string) => {
    const words = plainText.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);

    updateNodeData(id, {
      content,
      plainText,
      wordCount: words,
      lastEditedAt: new Date().toISOString(),
    } as Partial<TextNodeData>);
  };

  const handleResize = useCallback(
    (_event: any, params: any) => {
      // Update node dimensions in store
      updateNode(id, {
        style: {
          ...nodeStyle,
          width: params.width,
          height: params.height,
        },
      });
    },
    [id, updateNode, nodeStyle]
  );

  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
  }, []);

  const handleResizeEnd = useCallback(() => {
    // Small delay to ensure smooth transition back
    setTimeout(() => setIsResizing(false), 50);
  }, []);

  const handleActivationClick = useCallback(() => {
    if (!isActive) {
      setActiveNode(id);
    }
  }, [id, isActive, setActiveNode]);

  // Calculate actual dimensions with fallbacks
  const width = (typeof nodeWidth === 'number' ? nodeWidth : undefined) || 
                (nodeStyle as any)?.width || 
                TEXT_NODE_DEFAULT_WIDTH;
  const height = (typeof nodeHeight === 'number' ? nodeHeight : undefined) || 
                 (nodeStyle as any)?.height || 
                 TEXT_NODE_DEFAULT_HEIGHT;

  return (
    <div className="relative">
      <div
        onClick={handleActivationClick}
        className={`
          rounded-2xl bg-white border-2 border-[#E8ECEF] hover:border-[#D1D5DB]
          shadow-md hover:shadow-xl relative group
          ${isResizing ? 'resizing !transition-none' : 'transition-all duration-200'}
          ${selected || isActive ? 'ring-2 ring-[#095D40] ring-offset-2 !border-[#095D40]' : ''}
        `}
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height,
        }}
      >
      {/* Node Resizer */}
      <NodeResizer
        minWidth={TEXT_NODE_MIN_WIDTH}
        minHeight={TEXT_NODE_MIN_HEIGHT}
        maxWidth={TEXT_NODE_MAX_WIDTH}
        maxHeight={TEXT_NODE_MAX_HEIGHT}
        color="transparent"
        handleClassName="!w-3 !h-3 !border-2 !border-[#095D40] !bg-white !rounded-full !opacity-0 group-hover:!opacity-100 !transition-opacity !duration-200"
        lineClassName="!hidden"
        isVisible={selected}
        keepAspectRatio={false}
        onResize={handleResize}
        onResizeStart={handleResizeStart}
        onResizeEnd={handleResizeEnd}
      />

      {/* Connection Handles */}
      {!parentId && (
        <>
          <Handle
            type="source"
            position={Position.Right}
            className="!w-3.5 !h-3.5 !bg-white !border-2 !border-[#9CA3AF] hover:!border-[#095D40] hover:!scale-125 !transition-all !duration-150 !z-50"
            style={{ right: '-7px' }}
          />
          <Handle
            type="target"
            position={Position.Left}
            className="!w-3.5 !h-3.5 !bg-white !border-2 !border-[#9CA3AF] hover:!border-[#095D40] hover:!scale-125 !transition-all !duration-150 !z-50"
            style={{ left: '-7px' }}
          />
        </>
      )}

      {/* Content Container */}
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Type className="h-4 w-4 text-[#6B7280]" />
            <span className="text-[13px] font-medium text-[#1A1D21]">
              Rich Text
            </span>
          </div>
          {wordCount > 0 && (
            <span className="text-[11px] text-[#9CA3AF]">
              {wordCount} word{wordCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Novel Editor - Notion-style inline markdown */}
        <div
          className="flex-1 min-h-0 mx-5 mb-5 border border-[#E5E7EB] rounded-lg overflow-hidden bg-white cursor-text"
          onMouseDown={(e) => {
            // Stop propagation to prevent ReactFlow from interfering
            e.stopPropagation();
          }}
          onClick={(e) => {
            // Stop propagation and focus the editor
            e.stopPropagation();
            // Find the editor element and focus it
            const editorElement = e.currentTarget.querySelector('[contenteditable="true"]') as HTMLElement;
            if (editorElement) {
              editorElement.focus();
            }
          }}
          style={{
            // Prevent content from shifting during resize
            contain: 'layout style paint',
          }}
        >
          <div className="h-full overflow-auto">
            <NovelEditor
              content={data.content}
              onChange={handleContentChange}
              editable={!data.disabled}
            />
          </div>
        </div>
      </div>
      </div>

      {/* Floating AI Instructions - Only show when node is selected */}
      {selected && (
        <FloatingAIInstructions
          value={data.aiInstructions}
          onChange={(value) =>
            updateNodeData(id, { aiInstructions: value } as Partial<TextNodeData>)
          }
          nodeId={id}
          nodeType="text"
        />
      )}
    </div>
  );
});

TextNode.displayName = 'TextNode';
