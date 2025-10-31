import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  NodeData,
  NodeType,
  Position,
  Viewport,
  NodeStyle,
} from "@/types/workflow";

function deepClone<T>(value: T): T {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

interface WorkflowStore {
  // State
  workflow: Workflow | null;
  selectedNodes: string[];
  selectedEdges: string[];
  clipboard: WorkflowNode[];
  activeNodeId: string | null;
  cursorPosition: Position | null;
  // Connection UI State
  isConnecting: boolean;
  connectHoveredTargetId: string | null;

  // History State
  history: Workflow[];
  historyIndex: number;

  // Persistence State
  isSaving: boolean;
  saveError: string | null;
  lastSaved: string | null;

  // Canvas Control State
  controlMode: "pointer" | "hand";
  snapToGrid: boolean;

  // Workflow Actions
  createWorkflow: (name: string, description?: string) => void;
  loadWorkflow: (workflow: Workflow) => void;
  setWorkflow: (workflow: Workflow) => void;
  updateWorkflowMetadata: (updates: Partial<Workflow>) => void;
  clearWorkflow: () => void;

  // Persistence Actions
  saveWorkflow: () => Promise<void>;
  setSaveStatus: (
    isSaving: boolean,
    error?: string | null,
    lastSaved?: string | null
  ) => void;

  // Node Actions
  addNode: (
    type: NodeType,
    position: Position,
    data?: Partial<NodeData>
  ) => WorkflowNode;
  updateNode: (id: string, updates: Partial<WorkflowNode>) => void;
  updateNodeData: (id: string, data: Partial<NodeData>) => void;
  updateNodePosition: (id: string, position: Position) => void;
  deleteNode: (id: string) => void;
  deleteNodes: (ids: string[]) => void;
  duplicateNode: (id: string) => void;

  // Edge Actions
  addEdge: (
    source: string,
    target: string,
    sourceHandle?: string,
    targetHandle?: string
  ) => void;
  updateEdge: (id: string, updates: Partial<WorkflowEdge>) => void;
  deleteEdge: (id: string) => void;
  deleteEdges: (ids: string[]) => void;

  // Selection Actions
  selectNode: (id: string, multi?: boolean) => void;
  selectEdge: (id: string, multi?: boolean) => void;
  clearSelection: () => void;

  // Clipboard Actions
  copyNodes: (ids: string[]) => void;
  pasteNodes: (position?: Position) => void;

  // Viewport Actions
  updateViewport: (viewport: Partial<Viewport>) => void;

  // Utility
  getNode: (id: string) => WorkflowNode | undefined;
  getEdge: (id: string) => WorkflowEdge | undefined;
  getConnectedNodes: (nodeId: string) => WorkflowNode[];

  // Recording Actions
  createNodeFromRecording: (
    audioBlob: Blob,
    transcript: string,
    duration: number
  ) => WorkflowNode;

  // History Actions
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  pushHistory: () => void;

  // Canvas Control Actions
  setControlMode: (mode: "pointer" | "hand") => void;
  toggleSnapToGrid: () => void;

  // Cursor Tracking
  setCursorPosition: (position: Position | null) => void;

  // Alignment Actions
  alignNodes: (
    nodeIds: string[],
    direction: "left" | "center" | "right" | "top" | "middle" | "bottom"
  ) => void;
  distributeNodes: (
    nodeIds: string[],
    direction: "horizontal" | "vertical"
  ) => void;

  // Activation Actions
  setActiveNode: (id: string | null) => void;
  // Connection UI Actions
  setConnecting: (is: boolean) => void;
  setConnectHoveredTarget: (id: string | null) => void;
}

const createDefaultWorkflow = (
  name: string,
  description?: string
): Workflow => ({
  id: crypto.randomUUID(),
  name,
  description,
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  metadata: {
    version: "1.0.0",
    tags: [],
    isPublic: false,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const createDefaultNodeData = (type: NodeType): NodeData => {
  const baseData = { type };
  switch (type) {
    case "text":
      return {
        ...baseData,
        content: JSON.stringify({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [],
            },
          ],
        }),
        plainText: "",
        wordCount: 0,
      } as NodeData;
    case "pdf":
      return {
        ...baseData,
        parseStatus: "idle",
      } as NodeData;
    case "voice":
      return {
        ...baseData,
        transcriptStatus: "idle",
        uploadStatus: "idle",
      } as NodeData;
    case "image":
      return {
        ...baseData,
        analysisStatus: "idle",
      } as NodeData;
    case "youtube":
      return {
        ...baseData,
        mode: "video",
        transcriptStatus: "unavailable",
      } as NodeData;
    case "instagram":
      return {
        ...baseData,
        fetchStatus: "idle",
      } as NodeData;
    case "linkedin":
      return {
        ...baseData,
        fetchStatus: "idle",
        analysisStatus: "idle",
      } as NodeData;
    case "mindmap":
      return {
        ...baseData,
        concept: "",
        tags: [],
      } as NodeData;
    case "template":
      return {
        ...baseData,
        templateType: "custom",
        generationStatus: "idle",
      } as NodeData;
    case "webpage":
      return {
        ...baseData,
        url: "",
        scrapeStatus: "idle",
      } as NodeData;
    case "chat":
      return {
        ...baseData,
        messages: [],
        linkedNodes: [],
        model: "gemini-2.5-flash",
        contextWindow: [],
      } as NodeData;
    case "connector":
      return {
        ...baseData,
        relationshipType: "workflow",
      } as NodeData;
    case "group":
      return {
        ...baseData,
        title: undefined,
      } as NodeData;
    case "sticky":
      return {
        ...baseData,
        content: JSON.stringify({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [],
            },
          ],
        }),
        backgroundColor: "#FEF3C7", // Default yellow sticky note
        textColor: "#1F2937",
        fontSize: "medium",
      } as NodeData;
    default:
      return { type } as NodeData;
  }
};

export const useWorkflowStore = create<WorkflowStore>()(
  immer((set, get) => ({
    // Initial State
    workflow: null,
    selectedNodes: [],
    selectedEdges: [],
    clipboard: [],
    activeNodeId: null,
    history: [],
    historyIndex: -1,
    isSaving: false,
    saveError: null,
    lastSaved: null,
    controlMode: "hand",
    snapToGrid: false,
    cursorPosition: null,
    isConnecting: false,
    connectHoveredTargetId: null,

    // Workflow Actions
    createWorkflow: (name, description) => {
      set((state) => {
        state.workflow = createDefaultWorkflow(name, description);
        state.cursorPosition = null;
      });
    },

    loadWorkflow: (workflow) => {
      set((state) => {
        state.workflow = workflow;
        state.selectedNodes = [];
        state.selectedEdges = [];
        state.activeNodeId = null;
        state.cursorPosition = null;
      });
    },

    setWorkflow: (workflow) => {
      set((state) => {
        state.workflow = workflow;
        state.cursorPosition = null;
      });
    },

    updateWorkflowMetadata: (updates) => {
      set((state) => {
        if (state.workflow) {
          Object.assign(state.workflow, updates);
          state.workflow.updatedAt = new Date().toISOString();
        }
      });
    },

    clearWorkflow: () => {
      set((state) => {
        state.workflow = null;
        state.selectedNodes = [];
        state.selectedEdges = [];
        state.clipboard = [];
        state.activeNodeId = null;
        state.isSaving = false;
        state.saveError = null;
        state.lastSaved = null;
        state.cursorPosition = null;
      });
    },

    // Persistence Actions
    saveWorkflow: async () => {
      const { workflow } = get();
      if (!workflow) return;

      set((state) => {
        state.isSaving = true;
        state.saveError = null;
      });

      try {
        // The actual save will be handled by the component layer
        // This is just for state management
        set((state) => {
          state.isSaving = false;
          state.lastSaved = new Date().toISOString();
        });
      } catch (error: unknown) {
        set((state) => {
          state.isSaving = false;
          state.saveError =
            error instanceof Error ? error.message : "Failed to save workflow";
        });
      }
    },

    setSaveStatus: (isSaving, error = null, lastSaved = null) => {
      set((state) => {
        state.isSaving = isSaving;
        state.saveError = error;
        if (lastSaved) {
          state.lastSaved = lastSaved;
        }
      });
    },

    // Node Actions
    addNode: (type, position, data) => {
      const { pushHistory } = get();
      pushHistory();

      let style: NodeStyle | undefined;
      if (type === "group") {
        style = { width: 640, height: 420, backgroundColor: "#F7F7F7" };
      } else if (type === "chat") {
        style = { width: 1100, height: 700 };
      }

      const node: WorkflowNode = {
        id: crypto.randomUUID(),
        type,
        position,
        data: { ...createDefaultNodeData(type), ...data },
        // sensible defaults for initial sizing so nodes are immediately usable
        style,
        zIndex: type === "group" ? 1 : 2,
      };

      set((state) => {
        if (state.workflow) {
          state.workflow.nodes.push(node);
          state.workflow.updatedAt = new Date().toISOString();
        }
      });

      return node;
    },

    updateNode: (id, updates) => {
      set((state) => {
        if (state.workflow) {
          const node = state.workflow.nodes.find((n) => n.id === id);
          if (node) {
            Object.assign(node, updates);
            state.workflow.updatedAt = new Date().toISOString();
          }
        }
      });
    },

    updateNodeData: (id, data) => {
      set((state) => {
        if (state.workflow) {
          const node = state.workflow.nodes.find((n) => n.id === id);
          if (node) {
            Object.assign(node.data, data);
            state.workflow.updatedAt = new Date().toISOString();
          }
        }
      });
    },

    updateNodePosition: (id, position) => {
      set((state) => {
        if (state.workflow) {
          const node = state.workflow.nodes.find((n) => n.id === id);
          if (node) {
            node.position = position;
            state.workflow.updatedAt = new Date().toISOString();
          }
        }
      });
    },

    deleteNode: (id) => {
      set((state) => {
        if (state.workflow) {
          // If deleting a group, detach its children to top-level
          const nodeToDelete = state.workflow.nodes.find((n) => n.id === id);
          if (nodeToDelete?.type === "group") {
            state.workflow.nodes.forEach((n) => {
              if (n.parentId === id) {
                n.parentId = null;
                // convert relative child position to absolute
                n.position = {
                  x: (nodeToDelete.position?.x || 0) + (n.position?.x || 0),
                  y: (nodeToDelete.position?.y || 0) + (n.position?.y || 0),
                };
                n.zIndex = 2;
              }
            });
          }

          state.workflow.nodes = state.workflow.nodes.filter(
            (n) => n.id !== id
          );
          state.workflow.edges = state.workflow.edges.filter(
            (e) => e.source !== id && e.target !== id
          );
          state.selectedNodes = state.selectedNodes.filter((nId) => nId !== id);
          // Deactivate if deleting the active node
          if (state.activeNodeId === id) {
            state.activeNodeId = null;
          }
          removeNodeIdsFromGroups(state.workflow.nodes, [id]);
          state.workflow.updatedAt = new Date().toISOString();
        }
      });
    },

    deleteNodes: (ids) => {
      const { pushHistory } = get();
      pushHistory();

      set((state) => {
        if (state.workflow) {
          // For any groups being deleted, detach their children
          const groupsBeingDeleted = new Set(
            state.workflow.nodes
              .filter((n) => ids.includes(n.id) && n.type === "group")
              .map((n) => n.id)
          );
          if (groupsBeingDeleted.size > 0) {
            state.workflow.nodes.forEach((n) => {
              if (n.parentId && groupsBeingDeleted.has(n.parentId)) {
                const parent = state.workflow!.nodes.find(
                  (p) => p.id === n.parentId
                );
                if (parent) {
                  n.parentId = null;
                  n.position = {
                    x: (parent.position?.x || 0) + (n.position?.x || 0),
                    y: (parent.position?.y || 0) + (n.position?.y || 0),
                  };
                  n.zIndex = 2;
                }
              }
            });
          }

          state.workflow.nodes = state.workflow.nodes.filter(
            (n) => !ids.includes(n.id)
          );
          state.workflow.edges = state.workflow.edges.filter(
            (e) => !ids.includes(e.source) && !ids.includes(e.target)
          );
          state.selectedNodes = state.selectedNodes.filter(
            (nId) => !ids.includes(nId)
          );
          // Deactivate if deleting the active node
          if (state.activeNodeId && ids.includes(state.activeNodeId)) {
            state.activeNodeId = null;
          }
          removeNodeIdsFromGroups(state.workflow.nodes, ids);
          state.workflow.updatedAt = new Date().toISOString();
        }
      });
    },

    duplicateNode: (id) => {
      set((state) => {
        if (state.workflow) {
          const original = state.workflow.nodes.find((n) => n.id === id);
          if (original) {
            const duplicate: WorkflowNode = deepClone(original);
            duplicate.id = crypto.randomUUID();
            duplicate.position = {
              x: original.position.x + 50,
              y: original.position.y + 50,
            };
            state.workflow.nodes.push(duplicate);
            state.workflow.updatedAt = new Date().toISOString();
          }
        }
      });
    },

    // Edge Actions
    addEdge: (source, target, sourceHandle, targetHandle) => {
      const edge: WorkflowEdge = {
        id: crypto.randomUUID(),
        source,
        target,
        sourceHandle,
        targetHandle,
        type: "smoothstep",
      };

      set((state) => {
        if (state.workflow) {
          state.workflow.edges.push(edge);
          state.workflow.updatedAt = new Date().toISOString();
        }
      });
    },

    updateEdge: (id, updates) => {
      set((state) => {
        if (state.workflow) {
          const edge = state.workflow.edges.find((e) => e.id === id);
          if (edge) {
            Object.assign(edge, updates);
            state.workflow.updatedAt = new Date().toISOString();
          }
        }
      });
    },

    deleteEdge: (id) => {
      set((state) => {
        if (state.workflow) {
          state.workflow.edges = state.workflow.edges.filter(
            (e) => e.id !== id
          );
          state.selectedEdges = state.selectedEdges.filter((eId) => eId !== id);
          state.workflow.updatedAt = new Date().toISOString();
        }
      });
    },

    deleteEdges: (ids) => {
      set((state) => {
        if (state.workflow) {
          state.workflow.edges = state.workflow.edges.filter(
            (e) => !ids.includes(e.id)
          );
          state.selectedEdges = state.selectedEdges.filter(
            (eId) => !ids.includes(eId)
          );
          state.workflow.updatedAt = new Date().toISOString();
        }
      });
    },

    // Selection Actions
    selectNode: (id, multi = false) => {
      set((state) => {
        if (multi) {
          if (state.selectedNodes.includes(id)) {
            state.selectedNodes = state.selectedNodes.filter(
              (nId) => nId !== id
            );
          } else {
            state.selectedNodes.push(id);
          }
        } else {
          state.selectedNodes = [id];
          state.selectedEdges = [];
        }
      });
    },

    selectEdge: (id, multi = false) => {
      set((state) => {
        if (multi) {
          if (state.selectedEdges.includes(id)) {
            state.selectedEdges = state.selectedEdges.filter(
              (eId) => eId !== id
            );
          } else {
            state.selectedEdges.push(id);
          }
        } else {
          state.selectedEdges = [id];
          state.selectedNodes = [];
        }
      });
    },

    clearSelection: () => {
      set((state) => {
        state.selectedNodes = [];
        state.selectedEdges = [];
      });
    },

    // Clipboard Actions
    copyNodes: (ids) => {
      const { workflow } = get();
      if (workflow) {
        const nodesToCopy = workflow.nodes
          .filter((n) => ids.includes(n.id))
          .map((node) => deepClone(node));
        set((state) => {
          state.clipboard = nodesToCopy;
        });
      }
    },

    pasteNodes: (position) => {
      set((state) => {
        if (state.workflow && state.clipboard.length > 0) {
          const idMap = new Map<string, string>();

          state.clipboard.forEach((node) => {
            idMap.set(node.id, crypto.randomUUID());
          });

          const rootNodes = state.clipboard.filter((node) => {
            const parentId = node.parentId ?? null;
            return !parentId || !idMap.has(parentId);
          });

          const offset = (() => {
            if (!position) {
              return { x: 50, y: 50 };
            }

            if (rootNodes.length === 0) {
              return { x: position.x, y: position.y };
            }

            const minX = Math.min(...rootNodes.map((node) => node.position.x));
            const minY = Math.min(...rootNodes.map((node) => node.position.y));
            const maxX = Math.max(...rootNodes.map((node) => node.position.x));
            const maxY = Math.max(...rootNodes.map((node) => node.position.y));

            const center = {
              x: minX + (maxX - minX) / 2,
              y: minY + (maxY - minY) / 2,
            };

            return {
              x: position.x - center.x,
              y: position.y - center.y,
            };
          })();

          const newNodes = state.clipboard.map((node) => {
            const clone = deepClone(node);
            const originalParentId = node.parentId ?? null;
            const newId = idMap.get(node.id);

            if (!newId) {
              return clone;
            }

            clone.id = newId;

            if (originalParentId && idMap.has(originalParentId)) {
              clone.parentId = idMap.get(originalParentId) ?? null;
            } else {
              clone.parentId = originalParentId;
            }

            const shouldOffset =
              !originalParentId || !idMap.has(originalParentId);

            if (shouldOffset) {
              clone.position = {
                x: node.position.x + offset.x,
                y: node.position.y + offset.y,
              };
            } else {
              clone.position = deepClone(node.position);
            }

            return clone;
          });

          state.workflow.nodes.push(...newNodes);
          state.workflow.updatedAt = new Date().toISOString();
        }
      });
    },

    // Viewport Actions
    updateViewport: (viewport) => {
      set((state) => {
        if (state.workflow) {
          Object.assign(state.workflow.viewport, viewport);
        }
      });
    },

    // Utility
    getNode: (id) => {
      const { workflow } = get();
      return workflow?.nodes.find((n) => n.id === id);
    },

    getEdge: (id) => {
      const { workflow } = get();
      return workflow?.edges.find((e) => e.id === id);
    },

    getConnectedNodes: (nodeId) => {
      const { workflow } = get();
      if (!workflow) return [];

      const connectedEdges = workflow.edges.filter(
        (e) => e.source === nodeId || e.target === nodeId
      );

      const connectedNodeIds = connectedEdges.map((e) =>
        e.source === nodeId ? e.target : e.source
      );

      return workflow.nodes.filter((n) => connectedNodeIds.includes(n.id));
    },

    // Recording Actions
    createNodeFromRecording: (audioBlob, transcript, duration) => {
      const { workflow, addNode } = get();
      if (!workflow) {
        throw new Error("No active workflow");
      }

      // Create object URL for audio playback
      const audioUrl = URL.createObjectURL(audioBlob);

      // Calculate position - center of current viewport
      const viewport = workflow.viewport;
      const basePosition = viewport
        ? {
            x: -viewport.x / (viewport.zoom || 1) + 400,
            y: -viewport.y / (viewport.zoom || 1) + 200,
          }
        : { x: 400, y: 200 };

      // Create voice node with recording data
      const node = addNode("voice", basePosition, {
        audioUrl,
        transcript,
        duration,
        transcriptStatus: "success",
        isLiveRecording: false,
      });

      return node;
    },

    // History Actions
    pushHistory: () => {
      const { workflow, history, historyIndex } = get();
      if (!workflow) return;

      set((state) => {
        // Clone current workflow
        const snapshot = deepClone(workflow);

        // Remove future history if we're not at the end
        if (historyIndex < history.length - 1) {
          state.history = state.history.slice(0, historyIndex + 1);
        }

        // Add snapshot to history
        state.history.push(snapshot);

        // FIXED: Reduce history limit from 50 to 10 items to prevent memory leaks
        // Each history item is a full workflow clone which can be multiple MBs for large workflows
        const MAX_HISTORY_ITEMS = 10;

        if (state.history.length > MAX_HISTORY_ITEMS) {
          state.history.shift();
        } else {
          state.historyIndex = state.history.length - 1;
        }
      });
    },

    undo: () => {
      const { history, historyIndex } = get();

      if (historyIndex <= 0) return;

      set((state) => {
        state.historyIndex = historyIndex - 1;
        state.workflow = deepClone(history[state.historyIndex]);
      });
    },

    redo: () => {
      const { history, historyIndex } = get();

      if (historyIndex >= history.length - 1) return;

      set((state) => {
        state.historyIndex = historyIndex + 1;
        state.workflow = deepClone(history[state.historyIndex]);
      });
    },

    canUndo: () => {
      const { historyIndex } = get();
      return historyIndex > 0;
    },

    canRedo: () => {
      const { history, historyIndex } = get();
      return historyIndex < history.length - 1;
    },

    // Canvas Control Actions
    setControlMode: (mode) => {
      set((state) => {
        state.controlMode = mode;
      });
    },

    toggleSnapToGrid: () => {
      set((state) => {
        state.snapToGrid = !state.snapToGrid;
      });
    },

    setCursorPosition: (position) => {
      set((state) => {
        state.cursorPosition = position ? { x: position.x, y: position.y } : null;
      });
    },

    // Alignment Actions
    alignNodes: (nodeIds, direction) => {
      set((state) => {
        if (!state.workflow) return;

        const nodes = state.workflow.nodes.filter((n) =>
          nodeIds.includes(n.id)
        );
        if (nodes.length < 2) return;

        if (direction === "left") {
          const minX = Math.min(...nodes.map((n) => n.position.x));
          nodes.forEach((n) => {
            n.position.x = minX;
          });
        } else if (direction === "center") {
          const avgX =
            nodes.reduce((sum, n) => sum + n.position.x, 0) / nodes.length;
          nodes.forEach((n) => {
            n.position.x = avgX;
          });
        } else if (direction === "right") {
          const maxX = Math.max(...nodes.map((n) => n.position.x));
          nodes.forEach((n) => {
            n.position.x = maxX;
          });
        } else if (direction === "top") {
          const minY = Math.min(...nodes.map((n) => n.position.y));
          nodes.forEach((n) => {
            n.position.y = minY;
          });
        } else if (direction === "middle") {
          const avgY =
            nodes.reduce((sum, n) => sum + n.position.y, 0) / nodes.length;
          nodes.forEach((n) => {
            n.position.y = avgY;
          });
        } else if (direction === "bottom") {
          const maxY = Math.max(...nodes.map((n) => n.position.y));
          nodes.forEach((n) => {
            n.position.y = maxY;
          });
        }

        state.workflow.updatedAt = new Date().toISOString();
      });
    },

    distributeNodes: (nodeIds, direction) => {
      set((state) => {
        if (!state.workflow) return;

        const nodes = state.workflow.nodes.filter((n) =>
          nodeIds.includes(n.id)
        );
        if (nodes.length < 3) return;

        if (direction === "horizontal") {
          const sorted = [...nodes].sort((a, b) => a.position.x - b.position.x);
          const first = sorted[0].position.x;
          const last = sorted[sorted.length - 1].position.x;
          const spacing = (last - first) / (sorted.length - 1);

          sorted.forEach((node, i) => {
            node.position.x = first + spacing * i;
          });
        } else {
          const sorted = [...nodes].sort((a, b) => a.position.y - b.position.y);
          const first = sorted[0].position.y;
          const last = sorted[sorted.length - 1].position.y;
          const spacing = (last - first) / (sorted.length - 1);

          sorted.forEach((node, i) => {
            node.position.y = first + spacing * i;
          });
        }

        state.workflow.updatedAt = new Date().toISOString();
      });
    },

    // Activation Actions
    setActiveNode: (id) => {
      set((state) => {
        state.activeNodeId = id;
      });
    },
    // Connection UI Actions
    setConnecting: (is) => {
      set((state) => {
        state.isConnecting = is;
      });
    },
    setConnectHoveredTarget: (id) => {
      set((state) => {
        state.connectHoveredTargetId = id;
      });
    },
  }))
);

// Helper - currently a no-op since grouping handled via parentId; kept for compatibility
function removeNodeIdsFromGroups(_nodes: WorkflowNode[], _ids: string[]) {
  // Intentionally left blank. If groups track explicit child lists in future,
  // this function can update them accordingly.
}
