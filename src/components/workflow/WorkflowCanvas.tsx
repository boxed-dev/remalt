import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import type { DragEvent as ReactDragEvent } from "react";
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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useWorkflowStore } from "@/lib/stores/workflow-store";
import { useStickyNotesStore } from "@/lib/stores/sticky-notes-store";
import type {
  WorkflowNode,
  WorkflowEdge,
  NodeData,
  NodeType,
  WebpageNodeData,
  YouTubeNodeData,
  InstagramNodeData,
  LinkedInNodeData,
  PDFNodeData,
  ImageNodeData,
  VoiceNodeData,
} from "@/types/workflow";
import { nodeTypes } from "./nodes";
import { edgeTypes } from "./edges";
import { PanelContextMenu } from "./PanelContextMenu";
import { NodeContextMenu } from "./NodeContextMenu";
import { SelectionContextMenu } from "./SelectionContextMenu";
import { SelectionFloatingToolbar } from "./SelectionFloatingToolbar";
import { QuickAddMenu } from "./QuickAddMenu";
import { ExportDialog } from "./ExportDialog";
import { isStickyNoteSelected } from "./StickyNoteOverlay";
import { SocialMediaDialog } from "./SocialMediaDialog";

type UrlNodeMapping = {
  type: NodeType;
  data: Partial<NodeData>;
};

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]);
const AUDIO_EXTENSIONS = new Set([
  "mp3",
  "wav",
  "m4a",
  "aac",
  "flac",
  "ogg",
  "opus",
]);
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
  return tagName === "input" || tagName === "textarea" || tagName === "select";
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
  const extension = pathname.split(".").pop() || "";

  if (host.includes("youtube.com") || host.includes("youtu.be")) {
    return {
      type: "youtube",
      data: { url: normalizedUrl } satisfies Partial<YouTubeNodeData>,
    };
  }

  if (
    host.includes("instagram.com") &&
    (pathname.includes("/reel/") ||
      pathname.includes("/p/") ||
      pathname.includes("/reels/"))
  ) {
    return {
      type: "instagram",
      data: { url: normalizedUrl } satisfies Partial<InstagramNodeData>,
    };
  }

  // LinkedIn posts detection
  if (
    host.includes("linkedin.com") &&
    (pathname.includes("/posts/") || pathname.includes("/feed/update/"))
  ) {
    return {
      type: "linkedin",
      data: { url: normalizedUrl } satisfies Partial<LinkedInNodeData>,
    };
  }

  if (extension === "pdf") {
    return {
      type: "pdf",
      data: { url: normalizedUrl } satisfies Partial<PDFNodeData>,
    };
  }

  if (IMAGE_EXTENSIONS.has(extension)) {
    return {
      type: "image",
      data: { imageUrl: normalizedUrl } satisfies Partial<ImageNodeData>,
    };
  }

  if (AUDIO_EXTENSIONS.has(extension)) {
    return {
      type: "voice",
      data: { audioUrl: normalizedUrl } satisfies Partial<VoiceNodeData>,
    };
  }

  return {
    type: "webpage",
    data: { url: normalizedUrl } satisfies Partial<WebpageNodeData>,
  };
}

function WorkflowCanvasInner() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const rafHandle = useRef<number | null>(null);
  const hasAppliedStoredViewport = useRef(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [nodeContextMenu, setNodeContextMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
  } | null>(null);
  const [selectionContextMenu, setSelectionContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [quickAddMenuOpen, setQuickAddMenuOpen] = useState(false);
  const [quickAddMenuPosition, setQuickAddMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [socialMediaDialogOpen, setSocialMediaDialogOpen] = useState(false);
  const [socialMediaDialogPosition, setSocialMediaDialogPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const reactFlowInstance = useReactFlow();
  const { screenToFlowPosition, getViewport, setViewport } = reactFlowInstance;

  // Sticky notes state
  const isStickyActive = useStickyNotesStore((state) => state.isActive);
  const addStickyNote = useStickyNotesStore((state) => state.addNote);

  // Use individual selectors to avoid infinite loops
  const workflow = useWorkflowStore((state) => state.workflow);
  const workflowNodes = useWorkflowStore(
    (state) => state.workflow?.nodes ?? EMPTY_NODES
  );
  const workflowEdges = useWorkflowStore(
    (state) => state.workflow?.edges ?? EMPTY_EDGES
  );
  const workflowViewport = useWorkflowStore(
    (state) => state.workflow?.viewport
  );
  const controlMode = useWorkflowStore((state) => state.controlMode);
  const snapToGrid = useWorkflowStore((state) => state.snapToGrid);
  const selectedNodes = useWorkflowStore((state) => state.selectedNodes);
  const clipboard = useWorkflowStore((state) => state.clipboard);

  const addNode = useWorkflowStore((state) => state.addNode);
  const updateNode = useWorkflowStore((state) => state.updateNode);
  const updateNodePosition = useWorkflowStore(
    (state) => state.updateNodePosition
  );
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
  const setActiveNode = useWorkflowStore((state) => state.setActiveNode);

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

  // FIXED: Optimize mapped nodes calculation
  // Only recalculate when workflowNodes array reference changes
  // Note: Zustand creates new array refs, but useMemo already handles this efficiently
  // The real optimization comes from stable callbacks and reduced re-renders elsewhere
  const mappedNodes = useMemo(() => {
    // CRITICAL: Sort nodes so parent (group) nodes come before child nodes
    // React Flow requires parent nodes to exist before child nodes reference them
    const sortedNodes = [...(workflowNodes as WorkflowNode[])].sort((a, b) => {
      // Group nodes (potential parents) come first
      if (a.type === "group" && b.type !== "group") return -1;
      if (a.type !== "group" && b.type === "group") return 1;
      // Within same type, maintain original order
      return 0;
    });

    return sortedNodes.map((node: WorkflowNode) => ({
      id: node.id,
      type: node.type,
      position: node.parentId
        ? { x: node.position.x, y: node.position.y }
        : node.position,
      data: node.data as Record<string, unknown>,
      // Inline style overrides for group nodes to ensure no outer border/box-shadow from React Flow
      style:
        node.type === "group"
          ? {
              ...(node.style || {}),
              boxShadow: "none",
              border: "none",
              outline: "none",
              backgroundColor: "transparent",
              padding: 0,
              margin: 0,
            }
          : node.style,
      parentId: node.parentId || undefined,
      // CRITICAL FIX: Don't set extent="parent" to allow free dragging
      // Parent-child relationships are managed in onNodeDragStop based on final position
      // This allows seamless dragging in/out of groups without hitting boundaries
      extent: undefined,
      zIndex:
        typeof node.zIndex === "number"
          ? node.zIndex
          : node.type === "group"
          ? 1
          : 2,
      className: node.type === "group" ? "react-flow__node-group" : undefined,
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
      type: edge.type || "smoothstep",
      animated: edge.animated,
      style: edge.style,
      label: edge.label,
      data: edge.data as Record<string, unknown>,
    }));
  }, [workflowEdges]);

  // FIXED: Remove setNodes/setEdges from dependencies - React guarantees they're stable
  // Apply mapped data to React Flow state
  useEffect(() => {
    setNodes(mappedNodes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mappedNodes]);

  useEffect(() => {
    setEdges(mappedEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mappedEdges]);

  // FIXED: Add proper debouncing (500ms) to prevent excessive viewport updates
  const viewportDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  const scheduleViewportPersist = useCallback(
    (viewport: Viewport) => {
      // Clear existing RAF
      if (rafHandle.current) {
        cancelAnimationFrame(rafHandle.current);
      }

      // Clear existing debounce timer
      if (viewportDebounceTimer.current) {
        clearTimeout(viewportDebounceTimer.current);
      }

      // Use RAF for smooth updates during pan/zoom
      rafHandle.current = requestAnimationFrame(() => {
        rafHandle.current = null;

        // Debounce the actual store update
        viewportDebounceTimer.current = setTimeout(() => {
          updateViewport(viewport);
          viewportDebounceTimer.current = null;
        }, 500); // 500ms debounce
      });
    },
    [updateViewport]
  );

  useEffect(() => {
    return () => {
      if (rafHandle.current) {
        cancelAnimationFrame(rafHandle.current);
      }
      if (viewportDebounceTimer.current) {
        clearTimeout(viewportDebounceTimer.current);
      }
    };
  }, []);

  // FIXED: Remove unstable useReactFlow functions from dependencies
  // getViewport and setViewport are stable but cause unnecessary re-runs
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowViewport]);

  // FIXED: Remove workflowNodes from dependencies to prevent constant recreation
  // Access nodes directly from store inside the callback instead
  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);

      changes.forEach((change) => {
        if (change.type === "position" && change.position && !change.dragging) {
          // Save position to store when drag completes
          updateNodePosition(change.id, change.position);

          // If this is a group node, also update all child positions
          // Access current nodes from store instead of closure
          const currentNodes =
            useWorkflowStore.getState().workflow?.nodes ?? [];
          const node = currentNodes.find((n) => n.id === change.id);
          if (node?.type === "group") {
            // Get all child nodes
            const children = currentNodes.filter(
              (n) => n.parentId === change.id
            );
            // Update each child's position in the store (they're already in relative coordinates)
            children.forEach((child) => {
              // Child positions are already relative, so we just need to ensure they're persisted
              updateNodePosition(child.id, child.position);
            });
          }
        } else if (change.type === "dimensions" && (change as any).dimensions) {
          // Handle dimension changes from NodeResizer
          const dimChange = change as any;
          if (dimChange.resizing === false && dimChange.dimensions) {
            updateNode(change.id, {
              style: {
                width: dimChange.dimensions.width,
                height: dimChange.dimensions.height,
              },
            });
          }
        } else if (change.type === "remove") {
          deleteNode(change.id);
        } else if (change.type === "select") {
          if (change.selected) {
            selectNode(change.id);
          }
        }
      });
    },
    [onNodesChange, updateNodePosition, deleteNode, selectNode, updateNode]
  );

  // FIXED: Memoize handleEdgesChange to prevent new function reference on every render
  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);

      changes.forEach((change) => {
        if (change.type === "remove") {
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

  // Always allow connections (including to/from group nodes)
  const isValidConnection = useCallback(() => true, []);

  // Handle pane click (deselect all and close context menus)
  const onPaneClick = useCallback((event: React.MouseEvent) => {
    // If sticky mode is active, add a sticky note
    if (isStickyActive && workflow?.id) {
      if (!reactFlowInstance) {
        return;
      }

      // Get the canvas bounds for proper coordinate conversion
      const rect = reactFlowWrapper.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      // Use screen coordinates relative to the canvas container
      const notePosition = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };

      addStickyNote(workflow.id, notePosition);
      return;
    }

    // Otherwise, handle normal click behavior
    clearSelection();
    setActiveNode(null);
    setContextMenuPosition(null);
    setNodeContextMenu(null);
    setSelectionContextMenu(null);
  }, [clearSelection, setActiveNode, isStickyActive, workflow?.id, addStickyNote, reactFlowInstance]);

  // FIXED: Access selectedNodes from store instead of using as dependency
  // This prevents callback recreation on every selection change
  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();

      // Access current selected nodes from store instead of closure
      const currentSelectedNodes = useWorkflowStore.getState().selectedNodes;

      // If 2+ nodes are selected, show selection context menu
      if (currentSelectedNodes.length >= 2) {
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
    },
    []
  );

  // Handle node context menu (right-click on node)
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setContextMenuPosition(null);
      setSelectionContextMenu(null);
      setNodeContextMenu({
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
      });
    },
    []
  );

  // Handle node deletion via keyboard
  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      // Don't delete nodes if a sticky note is selected
      if (isStickyNoteSelected) {
        return;
      }
      deleteNodes(deleted.map((n) => n.id));
    },
    [deleteNodes]
  );

  // Handle edge deletion via keyboard
  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      // Don't delete edges if a sticky note is selected
      if (isStickyNoteSelected) {
        return;
      }
      deleteEdges(deleted.map((e) => e.id));
    },
    [deleteEdges]
  );

  const onDragOver = useCallback((event: ReactDragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: ReactDragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData(
        "application/reactflow"
      ) as NodeType;
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
        .filter((n) => n.type === "group")
        .filter((g) =>
          reactFlowInstance.isNodeIntersecting(
            { id: g.id },
            { x: position.x, y: position.y, width: 1, height: 1 },
            true
          )
        );

      if (intersectingGroups.length > 0 && type !== "group") {
        // take top-most by zIndex
        const target = intersectingGroups.sort(
          (a, b) => (b.zIndex || 0) - (a.zIndex || 0)
        )[0];
        const targetNode = workflowNodes.find((n) => n.id === target.id);
        const relX = position.x - (targetNode?.position.x || 0);
        const relY = position.y - (targetNode?.position.y || 0);
        const child = addNode(type, { x: relX, y: relY });
        // update parent linkage and zIndex
        useWorkflowStore
          .getState()
          .updateNode(child.id, { parentId: target.id, zIndex: 2 });
      } else {
        addNode(type, position);
      }
    },
    [addNode, screenToFlowPosition, workflowNodes, reactFlowInstance]
  );

  // Highlight group under pointer while dragging (more reliable than node bounds)
  const dragRafRef = useRef<number | null>(null);
  const lastDragPayloadRef = useRef<{
    nodeId: string;
    point: { x: number; y: number };
  } | null>(null);

  const processDragHighlight = useCallback(
    (nodeId: string, point: { x: number; y: number }) => {
      const draggedNode = reactFlowInstance.getNode(nodeId);
      if (!draggedNode) return;

      // BUG FIX: Prevent groups from being dropped into other groups
      if (draggedNode.type === "group") {
        // Clear any existing drag-over highlights when dragging a group
        setNodes((prev) =>
          prev.map((n) => {
            if (n.type !== "group") return n;
            const prevFlag = Boolean((n.data as any)?.isDragOver);
            if (!prevFlag) return n;
            return {
              ...n,
              data: {
                ...(n.data as Record<string, unknown>),
                isDragOver: false,
              },
            };
          })
        );
        return;
      }

      // Get node dimensions for proper intersection testing
      const nodeWidth = draggedNode.width || draggedNode.measured?.width || 300;
      const nodeHeight =
        draggedNode.height || draggedNode.measured?.height || 200;

      // Calculate absolute position of the node
      // If node has a parent, its position is relative to parent, so convert to absolute
      let absoluteX = point.x;
      let absoluteY = point.y;

      if (draggedNode.parentId) {
        const parent = reactFlowInstance.getNode(draggedNode.parentId);
        if (parent) {
          absoluteX = parent.position.x + point.x;
          absoluteY = parent.position.y + point.y;
        }
      }

      // Create rectangle representing the dragged node's bounds in absolute coordinates
      const nodeRect = {
        x: absoluteX,
        y: absoluteY,
        width: nodeWidth,
        height: nodeHeight,
      };

      const groups = reactFlowInstance
        .getNodes()
        .filter((n) => n.type === "group" && n.id !== nodeId)
        .map((g) => {
          const groupWidth = g.width || g.measured?.width || 640;
          const groupHeight = g.height || g.measured?.height || 420;

          // Group header height (the dark bar at the top)
          const headerHeight = 44;

          const groupRect = {
            x: g.position.x,
            y: g.position.y,
            width: groupWidth,
            height: groupHeight,
          };

          // Content area is the drop zone (excludes the header)
          const contentArea = {
            x: groupRect.x,
            y: groupRect.y + headerHeight,
            width: groupRect.width,
            height: groupRect.height - headerHeight,
          };

          // Calculate the right and bottom edges of both rectangles
          const nodeRight = nodeRect.x + nodeRect.width;
          const nodeBottom = nodeRect.y + nodeRect.height;
          const contentRight = contentArea.x + contentArea.width;
          const contentBottom = contentArea.y + contentArea.height;

          // Check if the ENTIRE node is contained within the group's CONTENT AREA
          // This ensures nodes can only be dropped in the white area, not covering the header
          // Add small padding (2px) to account for border rendering and floating point precision
          const padding = 2;
          const isFullyContained =
            nodeRect.x >= contentArea.x + padding &&
            nodeRect.y >= contentArea.y + padding &&
            nodeRight <= contentRight - padding &&
            nodeBottom <= contentBottom - padding;

          return { g, hit: isFullyContained };
        });

      setNodes((prev) =>
        prev.map((n) => {
          if (n.type !== "group") return n;
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
    },
    [reactFlowInstance, setNodes]
  );

  const onNodeDrag = useCallback(
    (event: React.MouseEvent, node: Node) => {
      // Use the node's actual position, not the cursor position
      // The node position is the top-left corner of the node
      const nodePosition = { x: node.position.x, y: node.position.y };
      lastDragPayloadRef.current = { nodeId: node.id, point: nodePosition };
      if (dragRafRef.current !== null) return;
      dragRafRef.current = requestAnimationFrame(() => {
        dragRafRef.current = null;
        const payload = lastDragPayloadRef.current;
        if (!payload) return;
        processDragHighlight(payload.nodeId, payload.point);
      });
    },
    [processDragHighlight]
  );

  const onNodeDragStart = useCallback(
    (_: React.MouseEvent, node: Node) => {
      // Avoid heavy store writes during drag; lift z-index locally via setNodes
      setNodes((prev) =>
        prev.map((n) => (n.id === node.id ? { ...n, zIndex: 1000 } : n))
      );
    },
    [setNodes]
  );

  const onNodeDragStop = useCallback(
    (event: React.MouseEvent, node: Node) => {
      // clear highlights
      setNodes((prev) =>
        prev.map((n) =>
          n.type === "group"
            ? {
                ...n,
                data: {
                  ...(n.data as Record<string, unknown>),
                  isDragOver: false,
                },
              }
            : n
        )
      );

      // BUG FIX: Prevent groups from being children of other groups
      if (node.type === "group") {
        // Ensure group nodes are never assigned a parent
        const current = useWorkflowStore.getState().getNode(node.id);
        if (current?.parentId) {
          // If somehow a group has a parent, remove it
          useWorkflowStore.getState().updateNode(node.id, { parentId: null });
        }

        // Reset z-index locally and ensure no stray highlights
        setNodes((prev) =>
          prev.map((n) =>
            n.id === node.id ? { ...n, zIndex: 1, parentId: undefined } : n
          )
        );
        lastDragPayloadRef.current = null;
        return;
      }

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

      // Get node dimensions for proper hit testing
      const nodeWidth = node.width || node.measured?.width || 300;
      const nodeHeight = node.height || node.measured?.height || 200;

      // Calculate absolute position of the node
      // If node has a parent, its position is relative to parent, so convert to absolute
      let absoluteX = node.position.x;
      let absoluteY = node.position.y;

      if (node.parentId) {
        const parent = reactFlowInstance.getNode(node.parentId);
        if (parent) {
          absoluteX = parent.position.x + node.position.x;
          absoluteY = parent.position.y + node.position.y;
        }
      }

      // Create a rectangle representing the node's bounds in absolute coordinates
      // React Flow provides the correct position during drag regardless of extent setting
      const nodeRect = {
        x: absoluteX,
        y: absoluteY,
        width: nodeWidth,
        height: nodeHeight,
      };

      // Find all groups that intersect with the node's bounds
      const hitGroups = reactFlowInstance
        .getNodes()
        .filter((n) => n.type === "group" && n.id !== node.id)
        .filter((g) => !isAncestor(node.id, g.id))
        .filter((g) => {
          const groupWidth = g.width || g.measured?.width || 640;
          const groupHeight = g.height || g.measured?.height || 420;

          // Group header height (the dark bar at the top)
          const headerHeight = 44;

          const groupRect = {
            x: g.position.x,
            y: g.position.y,
            width: groupWidth,
            height: groupHeight,
          };

          // Content area is the drop zone (excludes the header)
          const contentArea = {
            x: groupRect.x,
            y: groupRect.y + headerHeight,
            width: groupRect.width,
            height: groupRect.height - headerHeight,
          };

          // Calculate the right and bottom edges of both rectangles
          const nodeRight = nodeRect.x + nodeRect.width;
          const nodeBottom = nodeRect.y + nodeRect.height;
          const contentRight = contentArea.x + contentArea.width;
          const contentBottom = contentArea.y + contentArea.height;

          // Check if the ENTIRE node is contained within the group's CONTENT AREA
          // This ensures nodes can only be dropped in the white area, not covering the header
          // Add small padding (2px) to account for border rendering and floating point precision
          const padding = 2;
          const isFullyContained =
            nodeRect.x >= contentArea.x + padding &&
            nodeRect.y >= contentArea.y + padding &&
            nodeRight <= contentRight - padding &&
            nodeBottom <= contentBottom - padding;

          return isFullyContained;
        });

      if (hitGroups.length > 0) {
        // Sort by z-index first (highest first - group on top), then by smallest group
        // When using full containment, prefer the innermost (smallest) group if multiple groups contain the node
        const target = hitGroups.sort((a, b) => {
          // Primary: Sort by z-index (highest first - group on top)
          const zDiff = (b.zIndex || 0) - (a.zIndex || 0);
          if (zDiff !== 0) return zDiff;

          // Secondary: Prefer smallest group (innermost group in case of nested groups)
          const areaA = (a.width || 0) * (a.height || 0);
          const areaB = (b.width || 0) * (b.height || 0);
          return areaA - areaB; // Smaller first
        })[0];

        const parent = store.getNode(target.id);
        if (parent) {
          // Check if node is already a child of this group
          const current = useWorkflowStore.getState().getNode(node.id);
          const isAlreadyChild = current?.parentId === parent.id;

          if (isAlreadyChild) {
            // Node is already a child of this group AND still within boundaries
            // Position is already relative and ReactFlow will handle the position update via handleNodesChange
            // No need to recalculate parent relationship
            console.log(
              `⏭️ Node "${node.id}" moved within parent group "${
                (parent.data as any)?.title || "Unnamed"
              }" - keeping parent relationship`
            );
            // Note: handleNodesChange will save the new position to Zustand store automatically
          } else {
            // Node is being adopted by a new group (or was not in any group)
            // Calculate relative position from absolute position
            let absX = node.position.x;
            let absY = node.position.y;

            // If node had a different parent, convert to absolute first
            if (current?.parentId) {
              const oldParent = useWorkflowStore
                .getState()
                .getNode(current.parentId);
              if (oldParent) {
                absX = oldParent.position.x + node.position.x;
                absY = oldParent.position.y + node.position.y;
              }
            }

            // Calculate relative position for new parent
            const relX = absX - parent.position.x;
            const relY = absY - parent.position.y;

            // Update node with parent relationship and relative position
            useWorkflowStore
              .getState()
              .updateNode(node.id, { parentId: parent.id, zIndex: 2 });
            useWorkflowStore
              .getState()
              .updateNodePosition(node.id, { x: relX, y: relY });

            // Force React Flow to update with new parent relationship
            // Keep extent undefined to allow free dragging
            setNodes((prev) =>
              prev.map((n) =>
                n.id === node.id
                  ? {
                      ...n,
                      position: { x: relX, y: relY },
                      parentId: parent.id,
                      extent: undefined,
                      zIndex: 2,
                    }
                  : n
              )
            );

            // Provide user feedback through console (can be replaced with toast notifications)
            console.log(
              `✅ Node "${node.id}" adopted by group "${
                (parent.data as any)?.title || "Unnamed"
              }"`
            );
          }
        }
      } else {
        // If dragged out from a group, convert back to absolute
        const current = useWorkflowStore.getState().getNode(node.id);
        if (current?.parentId) {
          const parent = useWorkflowStore.getState().getNode(current.parentId);
          if (parent) {
            // Convert relative position to absolute
            const absX = parent.position.x + current.position.x;
            const absY = parent.position.y + current.position.y;

            // First remove parent relationship in store
            useWorkflowStore
              .getState()
              .updateNode(node.id, { parentId: null, zIndex: 2 });
            // Then update to absolute position in store
            useWorkflowStore
              .getState()
              .updateNodePosition(node.id, { x: absX, y: absY });

            // Force React Flow to update immediately
            setNodes((prev) =>
              prev.map((n) =>
                n.id === node.id
                  ? {
                      ...n,
                      position: { x: absX, y: absY },
                      parentId: undefined,
                      extent: undefined,
                      zIndex: 2,
                    }
                  : n
              )
            );

            console.log(
              `⬅️ Node "${node.id}" removed from group "${
                (parent.data as any)?.title || "Unnamed"
              }"`
            );
          }
        }
      }

      // reset elevated z-index locally and ensure no stray highlights
      setNodes((prev) =>
        prev.map((n) =>
          n.id === node.id
            ? { ...n, zIndex: n.parentId ? 2 : n.type === "group" ? 1 : 2 }
            : n
        )
      );
      lastDragPayloadRef.current = null;
    },
    [reactFlowInstance, setNodes]
  );

  const onSelectionChange = useCallback(
    ({ nodes: selected }: { nodes: Node[]; edges: Edge[] }) => {
      // Use local node state for z-index highlighting to avoid store churn
      const selectedGroup = selected.find((n) => n.type === "group");
      if (selectedGroup) {
        setNodes((prev) =>
          prev.map((n) => {
            if (n.id === selectedGroup.id) return { ...n, zIndex: 50 };
            if ((n as any).parentId === selectedGroup.id)
              return { ...n, zIndex: 51 };
            return n;
          })
        );
      } else {
        setNodes((prev) =>
          prev.map((n) => {
            if (n.type === "group") return { ...n, zIndex: 1 };
            if ((n as any).parentId) return { ...n, zIndex: 2 };
            return n;
          })
        );
      }
    },
    [setNodes]
  );

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const target = event.target;
      const activeElement = document.activeElement;

      if (isEditableElement(target) || isEditableElement(activeElement)) {
        return;
      }

      const clipboardText = event.clipboardData?.getData("text/plain") ?? "";
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

    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [addNode, clearSelection, pasteNodes, screenToFlowPosition, selectNode]);

  // Space bar temporary pan mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !spacePressed) {
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
      if (e.code === "Space") {
        e.preventDefault();
        setSpacePressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [spacePressed]);

  // Quick add menu with slash command
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !quickAddMenuOpen) {
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

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [quickAddMenuOpen]);

  // ESC key to deactivate all nodes
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveNode(null);
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [setActiveNode]);

  if (!workflow) {
    return (
      <div className="flex items-center justify-center h-full bg-[#F5F5F5]">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white border border-[#E5E7EB] flex items-center justify-center shadow-sm">
            <svg
              className="h-10 w-10 text-[#9CA3AF]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h2 className="text-[20px] font-semibold text-gray-900 mb-2">
            No Workflow Loaded
          </h2>
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
      if (node?.type === "group") {
        // Select all children of the group
        const children =
          store.workflow?.nodes.filter((n) => n.parentId === node.id) || [];
        const childIds = children.map((c) => c.id);
        store.selectNode(selectedNodes[0], true); // Keep group selected
        childIds.forEach((id) => store.selectNode(id, true));
      }
    }
  }, []);

  const ungroupSelectedNodes = useCallback(() => {
    const store = useWorkflowStore.getState();
    const selectedNodes = store.selectedNodes;

    // Find selected groups
    const selectedGroups = selectedNodes
      .map((id) => store.getNode(id))
      .filter((node) => node?.type === "group");

    if (selectedGroups.length > 0) {
      // Ungroup the selected groups (detach their children)
      selectedGroups.forEach((group) => {
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
    const nodes = selectedNodes
      .map((id) => store.getNode(id))
      .filter(Boolean) as WorkflowNode[];
    if (nodes.length < 2) return;

    const minX = Math.min(...nodes.map((n) => n.position.x));
    const minY = Math.min(...nodes.map((n) => n.position.y));
    const maxX = Math.max(
      ...nodes.map((n) => n.position.x + ((n as any).width || 200))
    );
    const maxY = Math.max(
      ...nodes.map((n) => n.position.y + ((n as any).height || 100))
    );

    // Create group with some padding
    const groupWidth = Math.max(maxX - minX + 80, 360);
    const groupHeight = Math.max(maxY - minY + 80, 220);

    const groupNode = store.addNode(
      "group",
      { x: minX - 40, y: minY - 40 },
      {
        title: "New Group",
      }
    );

    // Set the style on the node after creation
    store.updateNode(groupNode.id, {
      style: {
        width: groupWidth,
        height: groupHeight,
        backgroundColor: "#F7F7F7",
      },
    });

    // Move selected nodes into the group
    nodes.forEach((node) => {
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
    "mod+g": createGroupFromSelection, // Ctrl+G / Cmd+G to group selected nodes
    "mod+shift+g": ungroupSelectedNodes, // Ctrl+Shift+G / Cmd+Shift+G to ungroup
    "mod+shift+c": selectGroupChildren, // Ctrl+Shift+C / Cmd+Shift+C to select group children
  });

  return (
    <div
      ref={reactFlowWrapper}
      className="h-full w-full relative"
      style={{ isolation: "isolate" }}
      data-lenis-prevent
      data-lenis-prevent-wheel
      data-lenis-prevent-touch
      data-testid="workflow-canvas"
    >
      <style jsx global>{`
        .react-flow__pane {
          cursor: grab !important;
        }
        .react-flow__pane:active {
          cursor: grabbing !important;
        }
      `}</style>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        defaultViewport={defaultViewport}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesConnectable={true}
        edgesFocusable={true}
        edgesReconnectable={false}
        isValidConnection={isValidConnection}
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
        panOnDrag={controlMode === "hand" || spacePressed}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
        selectionOnDrag={controlMode === "pointer" && !spacePressed}
        panActivationKeyCode={null}
        proOptions={{ hideAttribution: true }}
        connectionLineType={ConnectionLineType.SmoothStep}
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: false,
        }}
        deleteKeyCode={["Backspace", "Delete"]}
        multiSelectionKeyCode="Shift"
        snapToGrid={snapToGrid}
        snapGrid={[15, 15]}
      >
        <Background
          gap={16}
          size={2}
          color="#E0E0E0"
          style={{ backgroundColor: "#F5F5F5" }}
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
        onRunWorkflow={() => {
          // Future: Run workflow functionality
          console.log("Run workflow");
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
          console.log("Import DSL");
        }}
        onOrganize={() => {
          // Future: Auto-layout functionality
          console.log("Auto-organize nodes");
        }}
        canPaste={clipboard.length > 0}
      />

      <NodeContextMenu
        position={
          nodeContextMenu
            ? { x: nodeContextMenu.x, y: nodeContextMenu.y }
            : null
        }
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
        onHelp={() => {
          // Open help in new tab
          window.open("https://github.com/your-repo/docs", "_blank");
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

import { DifyCanvasToolbar } from "./DifyCanvasToolbar";

export function WorkflowCanvas() {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner />
      <DifyCanvasToolbar />
    </ReactFlowProvider>
  );
}
