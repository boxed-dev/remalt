'use client';

import { useCallback, useEffect, useMemo, useRef, type DragEvent } from 'react';
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Connection,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnMove,
  type OnMoveEnd,
  type Viewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import '@/app/workflow.css';

import { useWorkflowStore } from '@/lib/stores/workflow-store';
import type {
  WorkflowNode,
  WorkflowEdge,
  NodeData,
  NodeType,
  WebpageNodeData,
  YouTubeNodeData,
  PDFNodeData,
  ImageNodeData,
  VoiceNodeData,
} from '@/types/workflow';
import { shallow } from 'zustand/shallow';
import { nodeTypes } from './nodes';
import { edgeTypes } from './edges';
import { WorkflowControls } from './WorkflowControls';

type UrlNodeMapping = {
  type: NodeType;
  data: Partial<NodeData>;
};

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']);
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'opus']);
const EMPTY_NODES: WorkflowNode[] = [];
const EMPTY_EDGES: WorkflowEdge[] = [];

function isEditableElement(element: EventTarget | null): boolean {
  if (!element || !(element instanceof HTMLElement)) {
    return false;
  }

  if (element.isContentEditable) {
    return true;
  }

  const tagName = element.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
}

function tryParseUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const firstToken = trimmed.split(/\s+/)[0];

  try {
    return new URL(firstToken);
  } catch {
    try {
      return new URL(`https://${firstToken}`);
    } catch {
      return null;
    }
  }
}

function mapUrlToNode(url: URL): UrlNodeMapping {
  const normalizedUrl = url.toString();
  const host = url.hostname.toLowerCase();
  const pathname = url.pathname.toLowerCase();
  const extension = pathname.split('.').pop() || '';

  if (host.includes('youtube.com') || host.includes('youtu.be')) {
    return {
      type: 'youtube',
      data: { url: normalizedUrl } satisfies Partial<YouTubeNodeData>,
    };
  }

  if (extension === 'pdf') {
    return {
      type: 'pdf',
      data: { url: normalizedUrl } satisfies Partial<PDFNodeData>,
    };
  }

  if (IMAGE_EXTENSIONS.has(extension)) {
    return {
      type: 'image',
      data: { imageUrl: normalizedUrl } satisfies Partial<ImageNodeData>,
    };
  }

  if (AUDIO_EXTENSIONS.has(extension)) {
    return {
      type: 'voice',
      data: { audioUrl: normalizedUrl } satisfies Partial<VoiceNodeData>,
    };
  }

  return {
    type: 'webpage',
    data: { url: normalizedUrl } satisfies Partial<WebpageNodeData>,
  };
}

function WorkflowCanvasInner() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const rafHandle = useRef<number | null>(null);
  const hasAppliedStoredViewport = useRef(false);
  const { screenToFlowPosition, getViewport, setViewport } = useReactFlow();

  const workflow = useWorkflowStore((state) => state.workflow);
  const workflowNodes = useWorkflowStore(
    (state) => state.workflow?.nodes ?? EMPTY_NODES,
    shallow
  );
  const workflowEdges = useWorkflowStore(
    (state) => state.workflow?.edges ?? EMPTY_EDGES,
    shallow
  );
  const workflowViewport = useWorkflowStore((state) => state.workflow?.viewport);
  const addNode = useWorkflowStore((state) => state.addNode);
  const updateNodePosition = useWorkflowStore((state) => state.updateNodePosition);
  const deleteNode = useWorkflowStore((state) => state.deleteNode);
  const deleteNodes = useWorkflowStore((state) => state.deleteNodes);
  const addEdgeToStore = useWorkflowStore((state) => state.addEdge);
  const deleteEdge = useWorkflowStore((state) => state.deleteEdge);
  const deleteEdges = useWorkflowStore((state) => state.deleteEdges);
  const updateViewport = useWorkflowStore((state) => state.updateViewport);
  const selectNode = useWorkflowStore((state) => state.selectNode);
  const clearSelection = useWorkflowStore((state) => state.clearSelection);
  const pasteNodes = useWorkflowStore((state) => state.pasteNodes);
  const addNodesToGroup = useWorkflowStore((state) => state.addNodesToGroup);

  // Track dragged node for group drop
  const draggedNodeIdRef = useRef<string | null>(null);

  // Convert workflow nodes/edges to React Flow format
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const defaultViewport = useMemo<Viewport | undefined>(() => {
    if (!workflowViewport) {
      return undefined;
    }

    return {
      x: workflowViewport.x,
      y: workflowViewport.y,
      zoom: workflowViewport.zoom,
    };
  }, [workflowViewport]);

  // Sync workflow state to React Flow
  useEffect(() => {
    setNodes(
      workflowNodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data,
        style: node.style,
      }))
    );
  }, [workflowNodes, setNodes]);

  useEffect(() => {
    setEdges(
      workflowEdges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        type: edge.type,
        animated: edge.animated,
        style: edge.style,
        label: edge.label,
        data: edge.data,
      }))
    );
  }, [workflowEdges, setEdges]);

  const scheduleViewportPersist = useCallback(
    (viewport: Viewport) => {
      if (rafHandle.current) {
        cancelAnimationFrame(rafHandle.current);
      }

      rafHandle.current = requestAnimationFrame(() => {
        rafHandle.current = null;
        updateViewport(viewport);
      });
    },
    [updateViewport]
  );

  useEffect(() => {
    return () => {
      if (rafHandle.current) {
        cancelAnimationFrame(rafHandle.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!workflowViewport) {
      return;
    }

    const runtimeViewport = getViewport();
    const isDifferent =
      Math.abs(runtimeViewport.x - workflowViewport.x) > 0.5 ||
      Math.abs(runtimeViewport.y - workflowViewport.y) > 0.5 ||
      Math.abs(runtimeViewport.zoom - workflowViewport.zoom) > 0.0001;

    if (isDifferent) {
      setViewport(workflowViewport, {
        duration: hasAppliedStoredViewport.current ? 180 : 0,
        easing: (t) => 1 - Math.pow(1 - t, 3),
      });
      hasAppliedStoredViewport.current = true;
    }
  }, [getViewport, setViewport, workflowViewport]);

  // Handle node changes (position, selection, etc.)
  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);

      changes.forEach((change) => {
        if (change.type === 'position' && change.position && !change.dragging) {
          updateNodePosition(change.id, change.position);
        } else if (change.type === 'remove') {
          deleteNode(change.id);
        } else if (change.type === 'select') {
          if (change.selected) {
            selectNode(change.id);
          }
        }
      });
    },
    [onNodesChange, updateNodePosition, deleteNode, selectNode]
  );

  // Handle edge changes
  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);

      changes.forEach((change) => {
        if (change.type === 'remove') {
          deleteEdge(change.id);
        }
      });
    },
    [onEdgesChange, deleteEdge]
  );

  // Handle new connections
  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        addEdgeToStore(
          connection.source,
          connection.target,
          connection.sourceHandle || undefined,
          connection.targetHandle || undefined
        );
      }
    },
    [addEdgeToStore]
  );

  // Handle viewport changes
  const onMove = useCallback<OnMove>(
    (_event, viewport) => {
      scheduleViewportPersist(viewport);
    },
    [scheduleViewportPersist]
  );

  const onMoveEnd = useCallback<OnMoveEnd>(
    (_event, viewport) => {
      scheduleViewportPersist(viewport);
    },
    [scheduleViewportPersist]
  );

  // Handle pane click (deselect all)
  const onPaneClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  // Handle node deletion via keyboard
  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      deleteNodes(deleted.map((n) => n.id));
    },
    [deleteNodes]
  );

  // Handle edge deletion via keyboard
  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      deleteEdges(deleted.map((e) => e.id));
    },
    [deleteEdges]
  );

  // Handle node drag start
  const onNodeDragStart = useCallback((_event: React.MouseEvent, node: Node) => {
    draggedNodeIdRef.current = node.id;
  }, []);

  // Handle node drag stop
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const draggedId = draggedNodeIdRef.current;
      const targetGroupId = (window as any).__targetGroupId;

      draggedNodeIdRef.current = null;
      (window as any).__targetGroupId = null;

      // If we have a target group, add the node to it
      if (draggedId && targetGroupId && draggedId !== targetGroupId) {
        addNodesToGroup(targetGroupId, [draggedId]);
      }
    },
    [addNodesToGroup]
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (!type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(type, position);
    },
    [addNode, screenToFlowPosition]
  );

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const target = event.target;
      const activeElement = document.activeElement;

      if (isEditableElement(target) || isEditableElement(activeElement)) {
        return;
      }

      const clipboardText = event.clipboardData?.getData('text/plain') ?? '';
      const parsedUrl = tryParseUrl(clipboardText);

      if (parsedUrl) {
        event.preventDefault();

        const { type, data } = mapUrlToNode(parsedUrl);
        const wrapperBounds = reactFlowWrapper.current?.getBoundingClientRect();
        const centerPosition = wrapperBounds
          ? screenToFlowPosition({
              x: wrapperBounds.left + wrapperBounds.width / 2,
              y: wrapperBounds.top + wrapperBounds.height / 2,
            })
          : { x: 0, y: 0 };

        const newNode = addNode(type, centerPosition, data);
        clearSelection();
        selectNode(newNode.id);
        return;
      }

      const { clipboard } = useWorkflowStore.getState();
      if (clipboard.length > 0) {
        event.preventDefault();
        pasteNodes();
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [addNode, clearSelection, pasteNodes, screenToFlowPosition, selectNode]);

  if (!workflow) {
    return (
      <div className="flex items-center justify-center h-full bg-[#FAFBFC]">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white border border-[#E8ECEF] flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <svg className="h-10 w-10 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-[20px] font-semibold text-[#1A1D21] mb-2">No Workflow Loaded</h2>
          <p className="text-[14px] text-[#6B7280] leading-relaxed">
            Click nodes from the sidebar to add them to your workflow
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={reactFlowWrapper}
      className="h-full w-full relative"
      style={{ isolation: 'isolate' }}
      data-lenis-prevent
      data-lenis-prevent-wheel
      data-lenis-prevent-touch
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        defaultViewport={defaultViewport}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onMove={onMove}
        onMoveEnd={onMoveEnd}
        onPaneClick={onPaneClick}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onDragOver={onDragOver}
        onDrop={onDrop}
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={4}
        panOnScroll={true}
        panOnScrollSpeed={0.5}
        panOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
        selectionOnDrag={false}
        selectionMode="partial"
        panActivationKeyCode="Space"
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
        }}
        deleteKeyCode={['Backspace', 'Delete']}
        multiSelectionKeyCode="Shift"
        snapToGrid={true}
        snapGrid={[15, 15]}
      >
        <Background
          gap={24}
          size={1.5}
          color="#D1D5DB"
          style={{ backgroundColor: '#FAFBFC' }}
        />
      </ReactFlow>
    </div>
  );
}

export function WorkflowCanvas() {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner />
      <WorkflowControls />
    </ReactFlowProvider>
  );
}
