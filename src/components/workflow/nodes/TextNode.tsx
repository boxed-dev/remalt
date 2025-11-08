'use client';

import { memo, useState, useEffect, useCallback, useRef, type SyntheticEvent } from 'react';
import { Type } from 'lucide-react';
import { NodeResizer } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { NovelEditor } from '../NovelEditor';
import { FloatingAIInstructions } from './FloatingAIInstructions';
import { BaseNode } from './BaseNode';
import { NodeHeader, NodeHeaderBadge } from './NodeHeader';
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
  const activeNodeId = useWorkflowStore((state) => state.activeNodeId);
  const isActive = activeNodeId === id;
  const updateNode = useWorkflowStore((state) => state.updateNode);
  const [wordCount, setWordCount] = useState(data.wordCount || 0);
  const [isResizing, setIsResizing] = useState(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const stopReactFlowPropagation = useCallback((event: SyntheticEvent) => {
    event.stopPropagation();
    const nativeEvent = event.nativeEvent as Event & { stopImmediatePropagation?: () => void };
    nativeEvent?.stopImmediatePropagation?.();
  }, []);

  useEffect(() => {
    setWordCount(data.wordCount || 0);
  }, [data.wordCount]);

  // Auto-focus editor when node becomes active
  useEffect(() => {
    if (isActive && editorContainerRef.current) {
      const editorElement = editorContainerRef.current.querySelector('[contenteditable="true"]') as HTMLElement;
      if (editorElement && document.activeElement !== editorElement) {
        // Small delay to ensure overlay is removed
        setTimeout(() => {
          editorElement.focus();
        }, 0);
      }
    }
  }, [isActive]);

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

  // Calculate actual dimensions with fallbacks
  const width = (typeof nodeWidth === 'number' ? nodeWidth : undefined) || 
                (nodeStyle as any)?.width || 
                TEXT_NODE_DEFAULT_WIDTH;
  const height = (typeof nodeHeight === 'number' ? nodeHeight : undefined) || 
                 (nodeStyle as any)?.height || 
                 TEXT_NODE_DEFAULT_HEIGHT;

  return (
    <div className="relative group" style={{
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
    }}>
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

      <BaseNode
        id={id}
        showSourceHandle={true}
        showTargetHandle={true}
        parentId={parentId}
        contentClassName="p-0 h-full"
        header={
          <NodeHeader
            title="Rich Text"
            icon={<Type />}
            themeKey="text"
            trailing={
              wordCount > 0 ? (
                <NodeHeaderBadge tone="muted">
                  {wordCount} word{wordCount !== 1 ? 's' : ''}
                </NodeHeaderBadge>
              ) : null
            }
          />
        }
        headerClassName="overflow-hidden"
        style={{ width: '100%', height: '100%' }}
      >
        {/* Content Container */}
        <div className="flex h-full flex-col">
          <div
            ref={editorContainerRef}
            className="nodrag nopan mx-5 mb-5 flex-1 min-h-0 cursor-text overflow-hidden rounded-xl border border-[#E5E7EB] bg-white"
            onMouseDown={stopReactFlowPropagation}
            onPointerDown={stopReactFlowPropagation}
            onTouchStart={stopReactFlowPropagation}
            onTouchMove={stopReactFlowPropagation}
            onClick={(e) => {
              // Stop propagation and focus the editor
              stopReactFlowPropagation(e);
              // Find the editor element and focus it
              const editorElement = e.currentTarget.querySelector('[contenteditable="true"]') as HTMLElement;
              if (editorElement) {
                editorElement.focus();
              }
            }}
            style={{
              // Prevent content from shifting during resize
              contain: 'layout style paint',
              userSelect: 'text',
            }}
          >
            <div
              className="nodrag nopan nowheel h-full overflow-auto"
              onWheel={stopReactFlowPropagation}
              onTouchStart={stopReactFlowPropagation}
              onTouchMove={stopReactFlowPropagation}
              style={{ overscrollBehavior: 'contain' }}
            >
              <NovelEditor
                content={data.content}
                onChange={handleContentChange}
                editable={!data.disabled}
              />
            </div>
          </div>
        </div>
      </BaseNode>

      {/* Floating AI Instructions - visible once the node is active/selected */}
      {(isActive || selected) && (
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
