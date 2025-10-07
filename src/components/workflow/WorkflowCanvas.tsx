'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
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
import { nodeTypes } from './nodes';
import { edgeTypes } from './edges';
import { PanelContextMenu } from './PanelContextMenu';
import { NodeContextMenu } from './NodeContextMenu';
import { SelectionContextMenu } from './SelectionContextMenu';
import { SelectionFloatingToolbar } from './SelectionFloatingToolbar';
import { AlignmentGuides } from './AlignmentGuides';
import { QuickAddMenu } from './QuickAddMenu';
import { ExportDialog } from './ExportDialog';

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
  const [spacePressed, setSpacePressed] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [nodeContextMenu, setNodeContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [selectionContextMenu, setSelectionContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [quickAddMenuOpen, setQuickAddMenuOpen] = useState(false);
  const [quickAddMenuPosition, setQuickAddMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const { screenToFlowPosition, getViewport, setViewport } = useReactFlow();

  const workflow = useWorkflowStore((state) => state.workflow);
  const workflowNodes = useWorkflowStore(
    (state) => state.workflow?.nodes ?? EMPTY_NODES
  );
  const workflowEdges = useWorkflowStore(
    (state) => state.workflow?.edges ?? EMPTY_EDGES
  );
  const workflowViewport = useWorkflowStore((state) => state.workflow?.viewport);
  const controlMode = useWorkflowStore((state) => state.controlMode);
  const snapToGrid = useWorkflowStore((state) => state.snapToGrid);
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
  const copyNodes = useWorkflowStore((state) => state.copyNodes);
  const duplicateNode = useWorkflowStore((state) => state.duplicateNode);
  const clipboard = useWorkflowStore((state) => state.clipboard);
  const addNodesToGroup = useWorkflowStore((state) => state.addNodesToGroup);
  const selectedNodes = useWorkflowStore((state) => state.selectedNodes);
  const alignNodes = useWorkflowStore((state) => state.alignNodes);
  const distributeNodes = useWorkflowStore((state) => state.distributeNodes);
  const createGroup = useWorkflowStore((state) => state.createGroup);

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
      (workflowNodes as WorkflowNode[]).map((node: WorkflowNode) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data as Record<string, unknown>,
        style: node.style,
        dragging: node.id === draggingNodeId,
        className: node.id === draggingNodeId ? 'dragging-node' : undefined,
      }))
    );
  }, [workflowNodes, setNodes, draggingNodeId]);

  useEffect(() => {
    setEdges(
      (workflowEdges as WorkflowEdge[]).map((edge: WorkflowEdge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        type: edge.type,
        animated: edge.animated,
        style: edge.style,
        label: edge.label,
        data: edge.data as Record<string, unknown>,
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

  // Handle pane click (deselect all and close context menus)
  const onPaneClick = useCallback(() => {
    clearSelection();
    setContextMenuPosition(null);
    setNodeContextMenu(null);
    setSelectionContextMenu(null);
  }, [clearSelection]);

  // Handle pane context menu (right-click on canvas)
  const onPaneContextMenu = useCallback((event: MouseEvent | React.MouseEvent) => {
    event.preventDefault();

    // If 2+ nodes are selected, show selection context menu
    if (selectedNodes.length >= 2) {
      setContextMenuPosition(null);
      setNodeContextMenu(null);
      setSelectionContextMenu({
        x: event.clientX,
        y: event.clientY,
      });
    } else {
      // Otherwise show panel context menu
      setNodeContextMenu(null);
      setSelectionContextMenu(null);
      setContextMenuPosition({
        x: event.clientX,
        y: event.clientY,
      });
    }
  }, [selectedNodes]);

  // Handle node context menu (right-click on node)
  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    setContextMenuPosition(null);
    setSelectionContextMenu(null);
    setNodeContextMenu({
      x: event.clientX,
      y: event.clientY,
      nodeId: node.id,
    });
  }, []);

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
    setDraggingNodeId(node.id);
  }, []);

  // Handle node drag stop
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const draggedId = draggedNodeIdRef.current;
      const targetGroupId = (window as any).__targetGroupId;

      draggedNodeIdRef.current = null;
      (window as any).__targetGroupId = null;
      setDraggingNodeId(null);

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

  // Space bar temporary pan mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !spacePressed) {
        const target = e.target;
        if (
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          (target instanceof HTMLElement && target.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        setSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [spacePressed]);

  // Quick add menu with slash command
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !quickAddMenuOpen) {
        const target = e.target;
        if (
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          (target instanceof HTMLElement && target.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();

        // Get cursor position
        const wrapperBounds = reactFlowWrapper.current?.getBoundingClientRect();
        if (wrapperBounds) {
          setQuickAddMenuPosition({
            x: wrapperBounds.left + wrapperBounds.width / 2,
            y: wrapperBounds.top + wrapperBounds.height / 2,
          });
          setQuickAddMenuOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [quickAddMenuOpen]);

  if (!workflow) {
    return (
      <div className="flex items-center justify-center h-full bg-[#F3F4F6]">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white border border-[#E5E7EB] flex items-center justify-center shadow-sm">
            <svg className="h-10 w-10 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-[20px] font-semibold text-gray-900 mb-2">No Workflow Loaded</h2>
          <p className="text-[14px] text-gray-600 leading-relaxed">
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
        onPaneContextMenu={onPaneContextMenu}
        onNodeContextMenu={onNodeContextMenu}
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
        panOnScrollSpeed={1.2}
        panOnDrag={controlMode === 'hand' || spacePressed}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
        selectionOnDrag={controlMode === 'pointer' && !spacePressed}
        panActivationKeyCode={null}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
        }}
        deleteKeyCode={['Backspace', 'Delete']}
        multiSelectionKeyCode="Shift"
        snapToGrid={snapToGrid}
        snapGrid={[15, 15]}
      >
        <Background
          gap={16}
          size={2}
          color="#D1D5DB"
          style={{ backgroundColor: '#F9FAFB' }}
        />
      </ReactFlow>

      <PanelContextMenu
        position={contextMenuPosition}
        onClose={() => setContextMenuPosition(null)}
        onAddNode={(type) => {
          if (contextMenuPosition) {
            const position = screenToFlowPosition({
              x: contextMenuPosition.x,
              y: contextMenuPosition.y,
            });
            addNode(type as NodeType, position);
          }
        }}
        onAddNote={() => {
          if (contextMenuPosition) {
            const position = screenToFlowPosition({
              x: contextMenuPosition.x,
              y: contextMenuPosition.y,
            });
            addNode('text', position);
          }
        }}
        onRunWorkflow={() => {
          // Future: Run workflow functionality
          console.log('Run workflow');
        }}
        onPaste={() => {
          if (clipboard.length > 0) {
            const position = contextMenuPosition
              ? screenToFlowPosition({
                  x: contextMenuPosition.x,
                  y: contextMenuPosition.y,
                })
              : undefined;
            pasteNodes(position);
          }
        }}
        onExport={() => {
          setExportDialogOpen(true);
        }}
        onImport={() => {
          // Future: Import DSL functionality
          console.log('Import DSL');
        }}
        onOrganize={() => {
          // Future: Auto-layout functionality
          console.log('Auto-organize nodes');
        }}
        canPaste={clipboard.length > 0}
      />

      <NodeContextMenu
        position={nodeContextMenu ? { x: nodeContextMenu.x, y: nodeContextMenu.y } : null}
        nodeId={nodeContextMenu?.nodeId || null}
        onClose={() => setNodeContextMenu(null)}
        onCopy={(nodeId) => {
          copyNodes([nodeId]);
        }}
        onDuplicate={(nodeId) => {
          duplicateNode(nodeId);
        }}
        onDelete={(nodeId) => {
          deleteNode(nodeId);
        }}
        onAddToGroup={(nodeId) => {
          // Find all group nodes
          const groups = workflowNodes.filter((n) => n.type === 'group');
          if (groups.length > 0) {
            // Add to first group for now
            // Future: Show group selector dialog
            addNodesToGroup(groups[0].id, [nodeId]);
          } else {
            // Create new group with this node
            const node = workflowNodes.find((n) => n.id === nodeId);
            if (node) {
              createGroup([nodeId], { x: node.position.x - 50, y: node.position.y - 50 });
            }
          }
        }}
        onAddNote={() => {
          const node = workflowNodes.find((n) => n.id === nodeContextMenu?.nodeId);
          if (node) {
            addNode('text', { x: node.position.x + 50, y: node.position.y + 50 });
          }
        }}
        onHelp={() => {
          // Open help in new tab
          window.open('https://github.com/your-repo/docs', '_blank');
        }}
      />

      <SelectionContextMenu
        position={selectionContextMenu}
        selectedNodeIds={selectedNodes}
        onClose={() => setSelectionContextMenu(null)}
        onCopy={() => {
          copyNodes(selectedNodes);
        }}
        onGroup={() => {
          // Calculate center position of selected nodes
          const selectedNodeObjects = workflowNodes.filter((n) => selectedNodes.includes(n.id));
          if (selectedNodeObjects.length > 0) {
            const avgX = selectedNodeObjects.reduce((sum, n) => sum + n.position.x, 0) / selectedNodeObjects.length;
            const avgY = selectedNodeObjects.reduce((sum, n) => sum + n.position.y, 0) / selectedNodeObjects.length;
            createGroup(selectedNodes, { x: avgX - 150, y: avgY - 150 });
          }
        }}
        onAlign={(direction) => {
          alignNodes(selectedNodes, direction);
        }}
        onDistribute={(direction) => {
          distributeNodes(selectedNodes, direction);
        }}
        onDelete={() => {
          deleteNodes(selectedNodes);
        }}
      />

      <SelectionFloatingToolbar
        selectedNodeIds={selectedNodes}
        onCopy={() => {
          copyNodes(selectedNodes);
        }}
        onDelete={() => {
          deleteNodes(selectedNodes);
        }}
        onAlign={(direction) => {
          alignNodes(selectedNodes, direction);
        }}
        onDistribute={(direction) => {
          distributeNodes(selectedNodes, direction);
        }}
        onGroup={() => {
          // Calculate center position of selected nodes
          const selectedNodeObjects = workflowNodes.filter((n) => selectedNodes.includes(n.id));
          if (selectedNodeObjects.length > 0) {
            const avgX = selectedNodeObjects.reduce((sum, n) => sum + n.position.x, 0) / selectedNodeObjects.length;
            const avgY = selectedNodeObjects.reduce((sum, n) => sum + n.position.y, 0) / selectedNodeObjects.length;
            createGroup(selectedNodes, { x: avgX - 150, y: avgY - 150 });
          }
        }}
      />

      <AlignmentGuides draggingNodeId={draggingNodeId} />

      <QuickAddMenu
        isOpen={quickAddMenuOpen}
        position={quickAddMenuPosition}
        onClose={() => {
          setQuickAddMenuOpen(false);
          setQuickAddMenuPosition(null);
        }}
        onSelectNode={(type) => {
          if (quickAddMenuPosition) {
            const position = screenToFlowPosition({
              x: quickAddMenuPosition.x,
              y: quickAddMenuPosition.y,
            });
            addNode(type, position);
          }
        }}
      />

      <ExportDialog
        isOpen={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
      />
    </div>
  );
}

import { DifyCanvasToolbar } from './DifyCanvasToolbar';

export function WorkflowCanvas() {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner />
      <DifyCanvasToolbar />
    </ReactFlowProvider>
  );
}
