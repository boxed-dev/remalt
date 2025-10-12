import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import type { DragEvent as ReactDragEvent } from 'react';
import {
  ReactFlow,
  Background,
  useReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type Connection,
  type OnMove,
  type OnMoveEnd,
  type Viewport,
  ConnectionLineType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import type {
  WorkflowNode,
  WorkflowEdge,
  NodeData,
  NodeType,
  WebpageNodeData,
  YouTubeNodeData,
  InstagramNodeData,
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
import { QuickAddMenu } from './QuickAddMenu';
import { ExportDialog } from './ExportDialog';
import { SocialMediaDialog } from './SocialMediaDialog';

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

  if (host.includes('instagram.com') && (pathname.includes('/reel/') || pathname.includes('/p/') || pathname.includes('/reels/'))) {
    return {
      type: 'instagram',
      data: { url: normalizedUrl } satisfies Partial<InstagramNodeData>,
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
  const [quickAddMenuOpen, setQuickAddMenuOpen] = useState(false);
  const [quickAddMenuPosition, setQuickAddMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [socialMediaDialogOpen, setSocialMediaDialogOpen] = useState(false);
  const [socialMediaDialogPosition, setSocialMediaDialogPosition] = useState<{ x: number; y: number } | null>(null);
  const reactFlowInstance = useReactFlow();
  const { screenToFlowPosition, getViewport, setViewport } = reactFlowInstance;

  // Use individual selectors to avoid infinite loops
  const workflow = useWorkflowStore((state) => state.workflow);
  const workflowNodes = useWorkflowStore((state) => state.workflow?.nodes ?? EMPTY_NODES);
  const workflowEdges = useWorkflowStore((state) => state.workflow?.edges ?? EMPTY_EDGES);
  const workflowViewport = useWorkflowStore((state) => state.workflow?.viewport);
  const controlMode = useWorkflowStore((state) => state.controlMode);
  const snapToGrid = useWorkflowStore((state) => state.snapToGrid);
  const selectedNodes = useWorkflowStore((state) => state.selectedNodes);
  const clipboard = useWorkflowStore((state) => state.clipboard);

  const addNode = useWorkflowStore((state) => state.addNode);
  const updateNode = useWorkflowStore((state) => state.updateNode);
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
  const alignNodes = useWorkflowStore((state) => state.alignNodes);
  const distributeNodes = useWorkflowStore((state) => state.distributeNodes);

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

  // Sync workflow nodes to React Flow (memoized for immediate rendering)
  const mappedNodes = useMemo(() => {
    return (workflowNodes as WorkflowNode[]).map((node: WorkflowNode) => ({
      id: node.id,
      type: node.type,
      position: node.parentId
        ? { x: node.position.x, y: node.position.y }
        : node.position,
      data: node.data as Record<string, unknown>,
      style: node.style,
      parentId: node.parentId || undefined,
      extent: node.parentId ? ('parent' as const) : undefined,
      zIndex: typeof node.zIndex === 'number' ? node.zIndex : (node.type === 'group' ? 1 : 2),
      // Make groups fully draggable by removing the custom drag handle
      draggable: true,
      connectable: true,
      selectable: true,
    }));
  }, [workflowNodes]);

  // Sync workflow edges to React Flow (memoized for immediate rendering)
  const mappedEdges = useMemo(() => {
    return (workflowEdges as WorkflowEdge[]).map((edge: WorkflowEdge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: edge.type || 'smoothstep',
      animated: edge.animated,
      style: edge.style,
      label: edge.label,
      data: edge.data as Record<string, unknown>,
    }));
  }, [workflowEdges]);

  // Apply mapped data to React Flow state
  useEffect(() => {
    setNodes(mappedNodes);
  }, [mappedNodes, setNodes]);

  useEffect(() => {
    setEdges(mappedEdges);
  }, [mappedEdges, setEdges]);

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
        } else if (change.type === 'dimensions' && (change as any).dimensions) {
          // Handle dimension changes from NodeResizer
          const dimChange = change as any;
          if (dimChange.resizing === false && dimChange.dimensions) {
            updateNode(change.id, {
              style: {
                width: dimChange.dimensions.width,
                height: dimChange.dimensions.height,
              }
            });
          }
        } else if (change.type === 'remove') {
          deleteNode(change.id);
        } else if (change.type === 'select') {
          if (change.selected) {
            selectNode(change.id);
          }
        }
      });
    },
    [onNodesChange, updateNodePosition, deleteNode, selectNode, updateNode]
  );

  // Handle edge changes
  const handleEdgesChange: OnEdgesChange = (changes) => {
    onEdgesChange(changes);

    changes.forEach((change) => {
      if (change.type === 'remove') {
        deleteEdge(change.id);
      }
    });
  };

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


  const onDragOver = useCallback((event: ReactDragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: ReactDragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (!type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // If dropping while hovering a group, set as child
      const intersectingGroups = reactFlowInstance
        .getNodes()
        .filter((n) => n.type === 'group')
        .filter((g) => reactFlowInstance.isNodeIntersecting({ id: g.id }, { x: position.x, y: position.y, width: 1, height: 1 }, true));

      if (intersectingGroups.length > 0 && type !== 'group') {
        // take top-most by zIndex
        const target = intersectingGroups.sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))[0];
        const targetNode = workflowNodes.find((n) => n.id === target.id);
        const relX = position.x - (targetNode?.position.x || 0);
        const relY = position.y - (targetNode?.position.y || 0);
        const child = addNode(type, { x: relX, y: relY });
        // update parent linkage and zIndex
        useWorkflowStore.getState().updateNode(child.id, { parentId: target.id, zIndex: 2 });
      } else {
        addNode(type, position);
      }
    },
    [addNode, screenToFlowPosition, workflowNodes, reactFlowInstance]
  );

  // Highlight group under dragged node with improved detection (throttled with rAF)
  const dragRafRef = useRef<number | null>(null);
  const lastDragPayloadRef = useRef<{ nodeId: string; bounds: { x: number; y: number; width: number; height: number } } | null>(null);

  const processDragHighlight = useCallback((nodeId: string, bounds: { x: number; y: number; width: number; height: number }) => {
    const groups = reactFlowInstance
      .getNodes()
      .filter((n) => n.type === 'group' && n.id !== nodeId)
      .map((g) => ({
        g,
        hit: reactFlowInstance.isNodeIntersecting(
          { id: g.id },
          {
            x: bounds.x + bounds.width * 0.25,
            y: bounds.y + bounds.height * 0.25,
            width: bounds.width * 0.5,
            height: bounds.height * 0.5,
          },
          true
        ),
      }));

    // Only update nodes whose isDragOver actually changed to minimize renders
    setNodes((prev) =>
      prev.map((n) => {
        if (n.type !== 'group') return n;
        const hit = !!groups.find((x) => x.g.id === n.id && x.hit);
        const prevFlag = Boolean((n.data as any)?.isDragOver);
        if (hit === prevFlag) return n;
        return {
          ...n,
          data: {
            ...(n.data as Record<string, unknown>),
            isDragOver: hit,
          },
        };
      })
    );
  }, [reactFlowInstance, setNodes]);

  const onNodeDrag = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const bounds = {
        x: node.position.x,
        y: node.position.y,
        width: node.width || 0,
        height: node.height || 0,
      };

      lastDragPayloadRef.current = { nodeId: node.id, bounds };
      if (dragRafRef.current !== null) return;
      dragRafRef.current = requestAnimationFrame(() => {
        dragRafRef.current = null;
        const payload = lastDragPayloadRef.current;
        if (!payload) return;
        processDragHighlight(payload.nodeId, payload.bounds);
      });
    },
    [processDragHighlight]
  );

  const onNodeDragStart = useCallback((_: React.MouseEvent, node: Node) => {
    // Avoid heavy store writes during drag; lift z-index locally via setNodes
    setNodes((prev) =>
      prev.map((n) => (n.id === node.id ? { ...n, zIndex: 1000 } : n))
    );
  }, [setNodes]);

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      // clear highlights
      setNodes((prev) =>
        prev.map((n) =>
          n.type === 'group'
            ? { ...n, data: { ...(n.data as Record<string, unknown>), isDragOver: false } }
            : n
        )
      );

      // Reparent if over a group
      const center = {
        x: node.position.x + (node.width || 0) / 2,
        y: node.position.y + (node.height || 0) / 2,
      };
      const store = useWorkflowStore.getState();
      const isAncestor = (ancestorId: string, nodeId: string): boolean => {
        let current = store.getNode(nodeId);
        while (current?.parentId) {
          if (current.parentId === ancestorId) {
            return true;
          }
          current = store.getNode(current.parentId);
        }
        return false;
      };

      // Improved parenting logic with better intersection detection
      const nodeBounds = {
        x: node.position.x,
        y: node.position.y,
        width: node.width || 0,
        height: node.height || 0,
      };

      const hitGroups = reactFlowInstance
        .getNodes()
        .filter((n) => n.type === 'group' && n.id !== node.id)
        .filter((g) => !isAncestor(node.id, g.id))
        .filter((g) => {
          // Use 50% overlap detection for more reliable parenting
          return reactFlowInstance.isNodeIntersecting(
            { id: g.id },
            {
              x: nodeBounds.x + nodeBounds.width * 0.25,
              y: nodeBounds.y + nodeBounds.height * 0.25,
              width: nodeBounds.width * 0.5,
              height: nodeBounds.height * 0.5
            },
            true
          );
        });

      if (hitGroups.length > 0) {
        // Sort by z-index and then by intersection area for better targeting
        const target = hitGroups.sort((a, b) => {
          const zDiff = (b.zIndex || 0) - (a.zIndex || 0);
          if (zDiff !== 0) return zDiff;
          // If same z-index, prefer the one with larger intersection
          return (b.width || 0) * (b.height || 0) - (a.width || 0) * (a.height || 0);
        })[0];

        const parent = store.getNode(target.id);
        if (parent) {
          const relX = node.position.x - parent.position.x;
          const relY = node.position.y - parent.position.y;
          useWorkflowStore.getState().updateNode(node.id, { parentId: parent.id, zIndex: 2 });
          useWorkflowStore.getState().updateNodePosition(node.id, { x: relX, y: relY });

          // Provide user feedback through console (can be replaced with toast notifications)
          console.log(`Node "${node.id}" moved into group "${(parent.data as any)?.title || 'Unnamed'}"`);
        }
      } else {
        // If dragged out from a group, convert back to absolute
        const current = useWorkflowStore.getState().getNode(node.id);
        if (current?.parentId) {
          const parent = useWorkflowStore.getState().getNode(current.parentId);
          if (parent) {
            useWorkflowStore.getState().updateNode(node.id, { parentId: null });
            useWorkflowStore.getState().updateNodePosition(node.id, {
              x: parent.position.x + node.position.x,
              y: parent.position.y + node.position.y,
            });
          }
        }
      }
      // reset elevated z-index locally
      setNodes((prev) => prev.map((n) => (n.id === node.id ? { ...n, zIndex: 2 } : n)));
    },
    [reactFlowInstance, setNodes]
  );


  const onSelectionChange = useCallback(({ nodes: selected }: { nodes: Node[]; edges: Edge[] }) => {
    // Use local node state for z-index highlighting to avoid store churn
    const selectedGroup = selected.find((n) => n.type === 'group');
    if (selectedGroup) {
      setNodes((prev) => prev.map((n) => {
        if (n.id === selectedGroup.id) return { ...n, zIndex: 50 };
        if ((n as any).parentId === selectedGroup.id) return { ...n, zIndex: 51 };
        return n;
      }));
    } else {
      setNodes((prev) => prev.map((n) => {
        if (n.type === 'group') return { ...n, zIndex: 1 };
        if ((n as any).parentId) return { ...n, zIndex: 2 };
        return n;
      }));
    }
  }, [setNodes]);

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

  // Group keyboard shortcuts
  const selectGroupChildren = useCallback(() => {
    const store = useWorkflowStore.getState();
    const selectedNodes = store.selectedNodes;

    if (selectedNodes.length === 1) {
      const node = store.getNode(selectedNodes[0]);
      if (node?.type === 'group') {
        // Select all children of the group
        const children = store.workflow?.nodes.filter(n => n.parentId === node.id) || [];
        const childIds = children.map(c => c.id);
        store.selectNode(selectedNodes[0], true); // Keep group selected
        childIds.forEach(id => store.selectNode(id, true));
      }
    }
  }, []);

  const ungroupSelectedNodes = useCallback(() => {
    const store = useWorkflowStore.getState();
    const selectedNodes = store.selectedNodes;

    // Find selected groups
    const selectedGroups = selectedNodes
      .map(id => store.getNode(id))
      .filter(node => node?.type === 'group');

    if (selectedGroups.length > 0) {
      // Ungroup the selected groups (detach their children)
      selectedGroups.forEach(group => {
        if (group) {
          store.deleteNode(group.id); // This will handle detaching children
        }
      });
    }
  }, []);

  const createGroupFromSelection = useCallback(() => {
    const store = useWorkflowStore.getState();
    const selectedNodes = store.selectedNodes;

    if (selectedNodes.length < 2) return;

    // Calculate bounding box of selected nodes
    const nodes = selectedNodes.map(id => store.getNode(id)).filter(Boolean) as WorkflowNode[];
    if (nodes.length < 2) return;

    const minX = Math.min(...nodes.map(n => n.position.x));
    const minY = Math.min(...nodes.map(n => n.position.y));
    const maxX = Math.max(...nodes.map(n => n.position.x + ((n as any).width || 200)));
    const maxY = Math.max(...nodes.map(n => n.position.y + ((n as any).height || 100)));

    // Create group with some padding
    const groupWidth = Math.max(maxX - minX + 80, 360);
    const groupHeight = Math.max(maxY - minY + 80, 220);

    const groupNode = store.addNode('group', { x: minX - 40, y: minY - 40 }, {
      title: 'New Group'
    });

    // Set the style on the node after creation
    store.updateNode(groupNode.id, {
      style: { width: groupWidth, height: groupHeight, backgroundColor: '#F7F7F7' }
    });

    // Move selected nodes into the group
    nodes.forEach(node => {
      const relX = node.position.x - groupNode.position.x;
      const relY = node.position.y - groupNode.position.y;
      store.updateNode(node.id, { parentId: groupNode.id, zIndex: 2 });
      store.updateNodePosition(node.id, { x: relX, y: relY });
    });

    // Select the new group
    store.selectNode(groupNode.id);
  }, []);

  // Set up keyboard shortcuts
  useKeyboardShortcuts({
    'mod+g': createGroupFromSelection, // Ctrl+G / Cmd+G to group selected nodes
    'mod+shift+g': ungroupSelectedNodes, // Ctrl+Shift+G / Cmd+Shift+G to ungroup
    'mod+shift+c': selectGroupChildren, // Ctrl+Shift+C / Cmd+Shift+C to select group children
  });

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
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        onPaneContextMenu={onPaneContextMenu}
        onNodeContextMenu={onNodeContextMenu}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onSelectionChange={onSelectionChange}
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
        connectionLineType={ConnectionLineType.SmoothStep}
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
        onAddToGroup={() => {
          // Group functionality removed
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
          // Group functionality removed
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
          // Group functionality removed
        }}
      />

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
        onOpenSocialMediaDialog={() => {
          setSocialMediaDialogPosition(quickAddMenuPosition);
          setSocialMediaDialogOpen(true);
        }}
      />

      <SocialMediaDialog
        open={socialMediaDialogOpen}
        onOpenChange={setSocialMediaDialogOpen}
        onAddNode={(type, url) => {
          if (socialMediaDialogPosition) {
            const position = screenToFlowPosition({
              x: socialMediaDialogPosition.x,
              y: socialMediaDialogPosition.y,
            });
            addNode(type, position, { url } as Partial<NodeData>);
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
