import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { DifyCanvasToolbar } from "./DifyCanvasToolbar";
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

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const DEFAULT_NODE_WIDTH = 300;
const DEFAULT_NODE_HEIGHT = 200;
const DEFAULT_GROUP_WIDTH = 640;
const DEFAULT_GROUP_HEIGHT = 420;
const GROUP_HEADER_HEIGHT = 44;
const GROUP_CONTENT_PADDING = 2;
const CONNECT_MAGNET_RADIUS = 72;
const CONNECT_PREVIEW_RADIUS = 144;
const CONNECT_INDEX_CELL_SIZE = 320;
const GROUP_INDEX_CELL_SIZE = 360;

type ConnectableEntry = {
  id: string;
  handleX: number;
  handleY: number;
  rect: Rect;
};

type ConnectableIndex = {
  cellSize: number;
  entries: Map<string, ConnectableEntry>;
  cells: Map<string, string[]>;
};

type GroupEntry = {
  id: string;
  rect: Rect;
  contentRect: Rect;
  zIndex: number;
  area: number;
};

type GroupIndex = {
  cellSize: number;
  entries: Map<string, GroupEntry>;
  cells: Map<string, string[]>;
};

type ExtendedNode = Node & { parentId?: string };
type NodeDataWithDrag = Record<string, unknown> & { isDragOver?: boolean };

const EMPTY_CONNECTABLE_INDEX: ConnectableIndex = {
  cellSize: CONNECT_INDEX_CELL_SIZE,
  entries: new Map(),
  cells: new Map(),
};

const EMPTY_GROUP_INDEX: GroupIndex = {
  cellSize: GROUP_INDEX_CELL_SIZE,
  entries: new Map(),
  cells: new Map(),
};

type ReactFlowInstanceLike = Pick<ReturnType<typeof useReactFlow>, "getNode">;

function makeCellKey(x: number, y: number): string {
  return `${x}:${y}`;
}

function getNodeRect(node: Node): Rect {
  const width = node.width ?? node.measured?.width ?? DEFAULT_NODE_WIDTH;
  const height = node.height ?? node.measured?.height ?? DEFAULT_NODE_HEIGHT;
  const position = node.positionAbsolute ?? node.position;
  return { x: position.x, y: position.y, width, height };
}

function computeAbsoluteRect(
  node: Node,
  instance: ReactFlowInstanceLike,
  fallbackRelative?: { x: number; y: number }
): Rect {
  const width = node.width ?? node.measured?.width ?? DEFAULT_NODE_WIDTH;
  const height = node.height ?? node.measured?.height ?? DEFAULT_NODE_HEIGHT;

  if (node.positionAbsolute) {
    return {
      x: node.positionAbsolute.x,
      y: node.positionAbsolute.y,
      width,
      height,
    };
  }

  if (fallbackRelative) {
    const parentId = (node as ExtendedNode).parentId;
    if (parentId) {
      const parent = instance.getNode(parentId);
      if (parent) {
        const parentPosition = parent.positionAbsolute ?? parent.position;
        return {
          x: parentPosition.x + fallbackRelative.x,
          y: parentPosition.y + fallbackRelative.y,
          width,
          height,
        };
      }
    }

    return { x: fallbackRelative.x, y: fallbackRelative.y, width, height };
  }

  const parentId = (node as ExtendedNode).parentId;
  if (parentId) {
    const parent = instance.getNode(parentId);
    if (parent) {
      const parentPosition = parent.positionAbsolute ?? parent.position;
      return {
        x: parentPosition.x + node.position.x,
        y: parentPosition.y + node.position.y,
        width,
        height,
      };
    }
  }

  return { x: node.position.x, y: node.position.y, width, height };
}

function buildConnectableIndex(nodes: Node[]): ConnectableIndex {
  if (!nodes.length) {
    return EMPTY_CONNECTABLE_INDEX;
  }

  const entries = new Map<string, ConnectableEntry>();
  const cells = new Map<string, string[]>();
  const margin = CONNECT_PREVIEW_RADIUS;

  for (const node of nodes) {
    if (node.type === "group" || node.hidden) {
      continue;
    }

    const rect = getNodeRect(node);
    const handleX = rect.x;
    const handleY = rect.y + rect.height / 2;

    const entry: ConnectableEntry = {
      id: node.id,
      handleX,
      handleY,
      rect,
    };

    entries.set(node.id, entry);

    const minCellX = Math.floor((rect.x - margin) / CONNECT_INDEX_CELL_SIZE);
    const maxCellX = Math.floor((rect.x + rect.width + margin) / CONNECT_INDEX_CELL_SIZE);
    const minCellY = Math.floor((rect.y - margin) / CONNECT_INDEX_CELL_SIZE);
    const maxCellY = Math.floor((rect.y + rect.height + margin) / CONNECT_INDEX_CELL_SIZE);

    for (let cx = minCellX; cx <= maxCellX; cx += 1) {
      for (let cy = minCellY; cy <= maxCellY; cy += 1) {
        const key = makeCellKey(cx, cy);
        const bucket = cells.get(key);
        if (bucket) {
          bucket.push(node.id);
        } else {
          cells.set(key, [node.id]);
        }
      }
    }
  }

  return { cellSize: CONNECT_INDEX_CELL_SIZE, entries, cells };
}

function queryConnectableIndex(
  index: ConnectableIndex,
  x: number,
  y: number,
  radius: number
): ConnectableEntry[] {
  if (!index.entries.size) {
    return [];
  }

  const minCellX = Math.floor((x - radius) / index.cellSize);
  const maxCellX = Math.floor((x + radius) / index.cellSize);
  const minCellY = Math.floor((y - radius) / index.cellSize);
  const maxCellY = Math.floor((y + radius) / index.cellSize);
  const candidateIds = new Set<string>();

  for (let cx = minCellX; cx <= maxCellX; cx += 1) {
    for (let cy = minCellY; cy <= maxCellY; cy += 1) {
      const bucket = index.cells.get(makeCellKey(cx, cy));
      if (!bucket) continue;
      for (const id of bucket) {
        candidateIds.add(id);
      }
    }
  }

  const result: ConnectableEntry[] = [];
  const radiusSq = radius * radius;

  for (const id of candidateIds) {
    const entry = index.entries.get(id);
    if (!entry) continue;
    const dx = x - entry.handleX;
    const dy = y - entry.handleY;
    if (dx * dx + dy * dy <= radiusSq) {
      result.push(entry);
    }
  }

  return result;
}

function buildGroupIndex(nodes: Node[]): GroupIndex {
  if (!nodes.length) {
    return EMPTY_GROUP_INDEX;
  }

  const entries = new Map<string, GroupEntry>();
  const cells = new Map<string, string[]>();

  for (const node of nodes) {
    if (node.type !== "group") {
      continue;
    }

    const width = node.width ?? node.measured?.width ?? DEFAULT_GROUP_WIDTH;
    const height = node.height ?? node.measured?.height ?? DEFAULT_GROUP_HEIGHT;
    const position = node.positionAbsolute ?? node.position;

    const rect: Rect = { x: position.x, y: position.y, width, height };
    const contentRect: Rect = {
      x: rect.x,
      y: rect.y + GROUP_HEADER_HEIGHT,
      width: rect.width,
      height: Math.max(rect.height - GROUP_HEADER_HEIGHT, 0),
    };

    const entry: GroupEntry = {
      id: node.id,
      rect,
      contentRect,
      zIndex: node.zIndex ?? 0,
      area: rect.width * rect.height,
    };

    entries.set(node.id, entry);

    const minCellX = Math.floor(rect.x / GROUP_INDEX_CELL_SIZE);
    const maxCellX = Math.floor((rect.x + rect.width) / GROUP_INDEX_CELL_SIZE);
    const minCellY = Math.floor(rect.y / GROUP_INDEX_CELL_SIZE);
    const maxCellY = Math.floor((rect.y + rect.height) / GROUP_INDEX_CELL_SIZE);

    for (let cx = minCellX; cx <= maxCellX; cx += 1) {
      for (let cy = minCellY; cy <= maxCellY; cy += 1) {
        const key = makeCellKey(cx, cy);
        const bucket = cells.get(key);
        if (bucket) {
          bucket.push(node.id);
        } else {
          cells.set(key, [node.id]);
        }
      }
    }
  }

  return { cellSize: GROUP_INDEX_CELL_SIZE, entries, cells };
}

function isRectFullyInside(container: Rect, rect: Rect): boolean {
  return (
    rect.x >= container.x + GROUP_CONTENT_PADDING &&
    rect.y >= container.y + GROUP_CONTENT_PADDING &&
    rect.x + rect.width <= container.x + container.width - GROUP_CONTENT_PADDING &&
    rect.y + rect.height <= container.y + container.height - GROUP_CONTENT_PADDING
  );
}

function queryGroupsContainingRect(
  index: GroupIndex,
  rect: Rect,
  excludeIds: Set<string>
): GroupEntry[] {
  if (!index.entries.size) {
    return [];
  }

  const minCellX = Math.floor(rect.x / index.cellSize);
  const maxCellX = Math.floor((rect.x + rect.width) / index.cellSize);
  const minCellY = Math.floor(rect.y / index.cellSize);
  const maxCellY = Math.floor((rect.y + rect.height) / index.cellSize);
  const candidateIds = new Set<string>();

  for (let cx = minCellX; cx <= maxCellX; cx += 1) {
    for (let cy = minCellY; cy <= maxCellY; cy += 1) {
      const bucket = index.cells.get(makeCellKey(cx, cy));
      if (!bucket) continue;
      for (const id of bucket) {
        if (!excludeIds.has(id)) {
          candidateIds.add(id);
        }
      }
    }
  }

  const hits: GroupEntry[] = [];
  for (const id of candidateIds) {
    const entry = index.entries.get(id);
    if (!entry) continue;
    if (isRectFullyInside(entry.contentRect, rect)) {
      hits.push(entry);
    }
  }

  return hits.sort((a, b) => {
    const zDiff = (b.zIndex ?? 0) - (a.zIndex ?? 0);
    if (zDiff !== 0) return zDiff;
    return a.area - b.area;
  });
}

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
  const setCursorPosition = useWorkflowStore((state) => state.setCursorPosition);
  const connectSourceRef = useRef<string | null>(null);
  const connectedViaNativeRef = useRef(false);
  const connectableIndexRef = useRef<ConnectableIndex>(EMPTY_CONNECTABLE_INDEX);
  const groupIndexRef = useRef<GroupIndex>(EMPTY_GROUP_INDEX);

  // Sticky notes state
  const isStickyActive = useStickyNotesStore((state) => state.isActive);

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
  const isCanvasPinchDisabled = useWorkflowStore(
    (state) => state.isCanvasPinchDisabled
  );
  const selectedNodes = useWorkflowStore((state) => state.selectedNodes);
  const clipboard = useWorkflowStore((state) => state.clipboard);

  const addNode = useWorkflowStore((state) => state.addNode);
  const updateNode = useWorkflowStore((state) => state.updateNode);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
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
  const setConnecting = useWorkflowStore((state) => state.setConnecting);
  const setConnectHoveredTarget = useWorkflowStore((state) => state.setConnectHoveredTarget);
  const setConnectPreviewTarget = useWorkflowStore((state) => state.setConnectPreviewTarget);

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

  useEffect(() => {
    const rfNodes = reactFlowInstance.getNodes();
    connectableIndexRef.current = buildConnectableIndex(rfNodes);
    groupIndexRef.current = buildGroupIndex(rfNodes);
  }, [nodes, reactFlowInstance]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const wrapper = reactFlowWrapper.current;
      if (!wrapper) {
        return;
      }

      const bounds = wrapper.getBoundingClientRect();
      const withinBounds =
        event.clientX >= bounds.left &&
        event.clientX <= bounds.right &&
        event.clientY >= bounds.top &&
        event.clientY <= bounds.bottom;

      if (!withinBounds) {
        setCursorPosition(null);
        return;
      }

      const flowPosition = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      setCursorPosition(flowPosition);

      // Magnetic targeting while connecting - two-zone detection
      const store = useWorkflowStore.getState();
      if (store.isConnecting) {
        const candidates = queryConnectableIndex(
          connectableIndexRef.current,
          flowPosition.x,
          flowPosition.y,
          CONNECT_PREVIEW_RADIUS
        );

        let bestEntry: ConnectableEntry | null = null;
        let bestDist = Infinity;

        for (const entry of candidates) {
          if (entry.id === connectSourceRef.current) continue;
          const dx = flowPosition.x - entry.handleX;
          const dy = flowPosition.y - entry.handleY;
          const dist = Math.hypot(dx, dy);
          if (dist < bestDist) {
            bestDist = dist;
            bestEntry = entry;
          }
        }

        const hoveredId =
          bestEntry && bestDist <= CONNECT_MAGNET_RADIUS ? bestEntry.id : null;
        const previewId =
          bestEntry && bestDist <= CONNECT_PREVIEW_RADIUS ? bestEntry.id : null;

        if (hoveredId !== store.connectHoveredTargetId) {
          setConnectHoveredTarget(hoveredId);
        }

        if (previewId !== store.connectPreviewTargetId) {
          setConnectPreviewTarget(previewId);
        }
      }
    };

    const resetCursor = () => setCursorPosition(null);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerleave", resetCursor);
    window.addEventListener("blur", resetCursor);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", resetCursor);
      window.removeEventListener("blur", resetCursor);
    };
  }, [screenToFlowPosition, setCursorPosition, setConnectHoveredTarget, setConnectPreviewTarget]);

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
        } else if (change.type === "dimensions") {
          const { dimensions, resizing } = change;
          if (
            resizing === false &&
            dimensions &&
            typeof dimensions.width === "number" &&
            typeof dimensions.height === "number"
          ) {
            updateNode(change.id, {
              style: {
                width: dimensions.width,
                height: dimensions.height,
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
        connectedViaNativeRef.current = true;
        addEdgeToStore(
          connection.source,
          connection.target,
          connection.sourceHandle || undefined,
          connection.targetHandle || undefined
        );
      }
      // clear hover and preview targets after a successful connect
      setConnectHoveredTarget(null);
      setConnectPreviewTarget(null);
    },
    [addEdgeToStore, setConnectHoveredTarget, setConnectPreviewTarget]
  );

  // Begin/End connection lifecycle
  const onConnectStart = useCallback((_: any, params?: any) => {
    setConnecting(true);
    connectSourceRef.current = params?.nodeId ?? null;
  }, [setConnecting]);

  const onConnectEnd = useCallback(() => {
    const store = useWorkflowStore.getState();
    // If native connect didn't happen, but we're within magnetic zone, connect programmatically
    if (!connectedViaNativeRef.current && store.connectHoveredTargetId && connectSourceRef.current) {
      addEdgeToStore(connectSourceRef.current, store.connectHoveredTargetId);
    }
    // Cleanup
    connectedViaNativeRef.current = false;
    setConnecting(false);
    setConnectHoveredTarget(null);
    setConnectPreviewTarget(null);
    connectSourceRef.current = null;
  }, [addEdgeToStore, setConnecting, setConnectHoveredTarget, setConnectPreviewTarget]);

  // onConnectStop is not available in our React Flow version; rely on onConnectEnd only

  // Track potential target under cursor while connecting
  const onNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
    if (useWorkflowStore.getState().isConnecting) {
      setConnectHoveredTarget(node.id);
    }
  }, [setConnectHoveredTarget]);

  const onNodeMouseLeave = useCallback((_: React.MouseEvent, node: Node) => {
    const state = useWorkflowStore.getState();
    if (state.connectHoveredTargetId === node.id) {
      setConnectHoveredTarget(null);
    }
  }, [setConnectHoveredTarget]);

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
    // If sticky mode is active, add a sticky note as a proper React Flow node
    if (isStickyActive && workflow?.id && reactFlowInstance) {
      // Convert screen coordinates to flow coordinates
      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Add sticky note as a proper React Flow node
      addNode('sticky', position, {
        backgroundColor: '#FEF3C7', // Default yellow color
        textColor: '#1F2937',
      });

      // Deactivate sticky mode after adding a note
      useStickyNotesStore.getState().setActive(false);
      return;
    }

    // Otherwise, handle normal click behavior
    clearSelection();
    setActiveNode(null);
    setContextMenuPosition(null);
    setNodeContextMenu(null);
    setSelectionContextMenu(null);
  }, [clearSelection, setActiveNode, isStickyActive, workflow?.id, addNode, reactFlowInstance]);

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

      if (draggedNode.type === "group") {
        // Clear any existing drag-over highlights when dragging a group
        setNodes((prev) =>
          prev.map((n) => {
            if (n.type !== "group") return n;
            const existingData = (n.data ?? {}) as Record<string, unknown>;
            const prevFlag = Boolean((existingData as NodeDataWithDrag).isDragOver);
            if (!prevFlag) return n;
            return {
              ...n,
              data: {
                ...existingData,
                isDragOver: false,
              },
            };
          })
        );
        return;
      }

      const nodeRect = computeAbsoluteRect(draggedNode, reactFlowInstance, point);
      const excludeIds = new Set<string>([nodeId]);
      const store = useWorkflowStore.getState();

      const candidateGroups = queryGroupsContainingRect(
        groupIndexRef.current,
        nodeRect,
        excludeIds
      ).filter((entry) => {
        let current = store.getNode(entry.id);
        while (current?.parentId) {
          if (current.parentId === nodeId) {
            return false;
          }
          current = store.getNode(current.parentId);
        }
        return true;
      });

      const hitIds = new Set(candidateGroups.map((entry) => entry.id));

      setNodes((prev) =>
        prev.map((n) => {
          if (n.type !== "group") return n;
          const hit = hitIds.has(n.id);
          const existingData = (n.data ?? {}) as Record<string, unknown>;
          const prevFlag = Boolean((existingData as NodeDataWithDrag).isDragOver);
          if (hit === prevFlag) return n;
          return {
            ...n,
            data: {
              ...existingData,
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
    (_event: React.MouseEvent, node: Node) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.type === "group"
            ? {
                ...n,
                data: {
                  ...((n.data ?? {}) as Record<string, unknown>),
                  isDragOver: false,
                },
              }
            : n
        )
      );

      const store = useWorkflowStore.getState();

      if (node.type === "group") {
        const current = store.getNode(node.id);
        if (current?.parentId) {
          store.updateNode(node.id, { parentId: null });
        }
        setNodes((prev) =>
          prev.map((n) =>
            n.id === node.id ? { ...n, zIndex: 1, parentId: undefined } : n
          )
        );
        lastDragPayloadRef.current = null;
        return;
      }

      const nodeRect = computeAbsoluteRect(node, reactFlowInstance);
      const excludeIds = new Set<string>([node.id]);

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

      const candidateGroups = queryGroupsContainingRect(
        groupIndexRef.current,
        nodeRect,
        excludeIds
      ).filter((entry) => !isAncestor(node.id, entry.id));

      const targetEntry = candidateGroups[0];

      if (targetEntry) {
        const parentNode = store.getNode(targetEntry.id);
        const currentNode = store.getNode(node.id);
        if (parentNode) {
          const absX = nodeRect.x;
          const absY = nodeRect.y;

          if (currentNode?.parentId === parentNode.id) {
            // Existing relationship; position updates handled via node changes
          } else {
            const relX = absX - parentNode.position.x;
            const relY = absY - parentNode.position.y;
            store.updateNode(node.id, { parentId: parentNode.id, zIndex: 2 });
            store.updateNodePosition(node.id, { x: relX, y: relY });
            setNodes((prev) =>
              prev.map((n) =>
                n.id === node.id
                  ? {
                      ...n,
                      position: { x: relX, y: relY },
                      parentId: parentNode.id,
                      extent: undefined,
                      zIndex: 2,
                    }
                  : n
              )
            );
          }
        }
      } else {
        const currentNode = store.getNode(node.id);
        if (currentNode?.parentId) {
          const parentNode = store.getNode(currentNode.parentId);
          if (parentNode) {
            const absX = parentNode.position.x + currentNode.position.x;
            const absY = parentNode.position.y + currentNode.position.y;
            store.updateNode(node.id, { parentId: null, zIndex: 2 });
            store.updateNodePosition(node.id, { x: absX, y: absY });
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
          }
        }
      }

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
            const parentId = (n as ExtendedNode).parentId;
            if (parentId === selectedGroup.id)
              return { ...n, zIndex: 51 };
            return n;
          })
        );
      } else {
        setNodes((prev) =>
          prev.map((n) => {
            if (n.type === "group") return { ...n, zIndex: 1 };
            if ((n as ExtendedNode).parentId) return { ...n, zIndex: 2 };
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
        const { cursorPosition } = useWorkflowStore.getState();
        const wrapperBounds = reactFlowWrapper.current?.getBoundingClientRect();
        const fallbackPosition = wrapperBounds
          ? screenToFlowPosition({
              x: wrapperBounds.left + wrapperBounds.width / 2,
              y: wrapperBounds.top + wrapperBounds.height / 2,
            })
          : { x: 0, y: 0 };

        const targetPosition = cursorPosition ?? fallbackPosition;

        const newNode = addNode(type, targetPosition, data);
        clearSelection();
        selectNode(newNode.id);
        return;
      }

      const { clipboard, cursorPosition } = useWorkflowStore.getState();
      if (clipboard.length > 0) {
        event.preventDefault();
        pasteNodes(cursorPosition ?? undefined);
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
      ...nodes.map((n) =>
        n.position.x + (typeof n.style?.width === "number" ? n.style.width : 200)
      )
    );
    const maxY = Math.max(
      ...nodes.map((n) =>
        n.position.y + (typeof n.style?.height === "number" ? n.style.height : 100)
      )
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

  // Handler to open social media dialog at viewport center
  const handleOpenSocialMediaDialog = useCallback(() => {
    const windowCenterX = window.innerWidth / 2;
    const windowCenterY = window.innerHeight / 2;
    
    setSocialMediaDialogPosition({
      x: windowCenterX,
      y: windowCenterY,
    });
    setSocialMediaDialogOpen(true);
  }, []);

  // Set up keyboard shortcuts (most node creation shortcuts handled in page.tsx)
  useKeyboardShortcuts({
    "s": handleOpenSocialMediaDialog,
    "mod+g": createGroupFromSelection,
    "mod+shift+g": ungroupSelectedNodes,
    "mod+shift+c": selectGroupChildren,
  });

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (isEditableElement(e.target)) return;

      const items = Array.from(e.clipboardData?.items || []);
      const imageItem = items.find(item => item.type.startsWith('image/'));

      if (imageItem) {
        e.preventDefault();
        const file = imageItem.getAsFile();
        if (!file) return;

        const { cursorPosition } = useWorkflowStore.getState();
        const position = cursorPosition || { x: 100, y: 100 };
        const node = addNode('image', position);

        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          updateNodeData(node.id, {
            uploadSource: 'clipboard',
            imageUrl: base64,
          } as Partial<ImageNodeData>);
        };
        reader.readAsDataURL(file);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [addNode, updateNodeData]);

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
        .flowy-handle {
          position: absolute;
          border-radius: 9999px !important;
          transition: transform 180ms cubic-bezier(0.4, 0, 0.2, 1),
            box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1);
          transform-origin: center;
          cursor: pointer;
        }
        .flowy-handle::before {
          content: "";
          position: absolute;
          inset: -12px;
          border-radius: 9999px;
          background: transparent;
          pointer-events: auto;
        }
        .flowy-handle::after {
          content: "";
          position: absolute;
          inset: -6px;
          border-radius: 9999px;
          pointer-events: none;
          background: radial-gradient(50% 50% at 50% 50%, rgba(9,93,64,0.18) 0%, rgba(9,93,64,0) 65%);
          opacity: 0;
          transition: opacity 200ms ease;
        }
        .flowy-handle:hover {
          transform: scale(1.45);
          box-shadow: 0 0 0 3px rgba(9,93,64,0.18);
        }
        .flowy-handle:hover::after {
          opacity: 1;
        }
        .flowy-node {
          position: relative;
        }
        .flowy-node::after {
          content: "";
          position: absolute;
          inset: -4px;
          border-radius: inherit;
          pointer-events: none;
          opacity: 0;
          transition: opacity 180ms cubic-bezier(0.4, 0, 0.2, 1),
            box-shadow 180ms cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 0 0 0 rgba(9,93,64,0.22);
        }
        .flowy-node.flowy-preview-node::after {
          opacity: 1;
          box-shadow: 0 0 0 5px rgba(9,93,64,0.18);
        }
        .flowy-node.flowy-magnetic-node::after {
          opacity: 1;
          box-shadow: 0 0 0 6px rgba(9,93,64,0.28);
        }
        /* Preview zone (144px) - early visual feedback */
        .flowy-preview-handle {
          border-color: #095D40 !important;
          transform: scale(1.3) !important;
          box-shadow: 0 0 0 3px rgba(9,93,64,0.15), 0 0 12px rgba(9,93,64,0.25);
          transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 60;
        }

        /* Magnetic zone (72px) - strong snap effect with blackhole */
        .flowy-magnetic-handle {
          border-color: #095D40 !important;
          transform: scale(2) !important;
          z-index: 70;
          box-shadow: 0 0 0 4px rgba(9,93,64,0.3);
          transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        .flowy-magnetic-handle::before,
        .flowy-magnetic-handle::after {
          content: "";
          position: absolute;
          inset: -20px;
          border-radius: 9999px;
          pointer-events: none;
        }
        .flowy-magnetic-handle::before {
          background: radial-gradient(60% 60% at 50% 50%, rgba(9,93,64,0.35) 0%, rgba(9,93,64,0.12) 45%, rgba(9,93,64,0) 60%);
          filter: blur(6px);
          opacity: .9;
          animation: magnetic-glow 900ms ease-in-out infinite alternate;
          transform: scale(2.4);
        }
        .flowy-magnetic-handle::after {
          -webkit-mask: radial-gradient(circle at 50% 50%, transparent 40%, black 42%);
          mask: radial-gradient(circle at 50% 50%, transparent 40%, black 42%);
          background: radial-gradient(60% 60% at 50% 50%, rgba(3,7,18,0.75) 0%, rgba(3,7,18,0.35) 42%, rgba(3,7,18,0) 60%);
          animation: magnetic-pulse 950ms ease-in-out infinite;
          opacity: .85;
          transform: scale(2.0);
        }

        /* Node-level highlighting */
        .flowy-preview-node {
          border-color: #095D40 !important;
          border-width: 2px !important;
          box-shadow: 0 0 0 2px rgba(9,93,64,0.1), 0 4px 12px rgba(0,0,0,0.1) !important;
          transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        .flowy-magnetic-node {
          border-color: #095D40 !important;
          border-width: 3px !important;
          box-shadow: 0 0 0 4px rgba(9,93,64,0.2), 0 8px 24px rgba(9,93,64,0.15), 0 4px 16px rgba(0,0,0,0.1) !important;
          transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes magnetic-glow {
          from { transform: scale(1.00); }
          to { transform: scale(0.96); }
        }
        @keyframes magnetic-pulse {
          0%   { transform: scale(1.00); }
          50%  { transform: scale(0.92); }
          100% { transform: scale(1.00); }
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
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
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
        zoomOnScroll={!isCanvasPinchDisabled}
        zoomOnPinch={!isCanvasPinchDisabled}
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

export function WorkflowCanvas() {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner />
      <DifyCanvasToolbar />
    </ReactFlowProvider>
  );
}
