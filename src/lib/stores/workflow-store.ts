import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  NodeData,
  NodeType,
  Position,
  Viewport
} from '@/types/workflow';

function deepClone<T>(value: T): T {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function removeNodeIdsFromGroups(nodes: WorkflowNode[], ids: string[]) {
  nodes.forEach((node) => {
    if (node.type === 'group' && 'groupedNodes' in node.data) {
      const grouped = node.data.groupedNodes || [];
      const filtered = grouped.filter((nodeId) => !ids.includes(nodeId));
      if (filtered.length !== grouped.length) {
        node.data.groupedNodes = filtered;
      }
    }
  });
}

interface WorkflowStore {
  // State
  workflow: Workflow | null;
  selectedNodes: string[];
  selectedEdges: string[];
  clipboard: WorkflowNode[];

  // History State
  history: Workflow[];
  historyIndex: number;

  // Persistence State
  isSaving: boolean;
  saveError: string | null;
  lastSaved: string | null;

  // Workflow Actions
  createWorkflow: (name: string, description?: string) => void;
  loadWorkflow: (workflow: Workflow) => void;
  updateWorkflowMetadata: (updates: Partial<Workflow>) => void;
  clearWorkflow: () => void;

  // Persistence Actions
  saveWorkflow: () => Promise<void>;
  setSaveStatus: (isSaving: boolean, error?: string | null, lastSaved?: string | null) => void;

  // Node Actions
  addNode: (type: NodeType, position: Position, data?: Partial<NodeData>) => WorkflowNode;
  updateNode: (id: string, updates: Partial<WorkflowNode>) => void;
  updateNodeData: (id: string, data: Partial<NodeData>) => void;
  updateNodePosition: (id: string, position: Position) => void;
  deleteNode: (id: string) => void;
  deleteNodes: (ids: string[]) => void;
  duplicateNode: (id: string) => void;

  // Edge Actions
  addEdge: (source: string, target: string, sourceHandle?: string, targetHandle?: string) => void;
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

  // Group Actions
  createGroup: (nodeIds: string[], position: Position) => void;
  addNodesToGroup: (groupId: string, nodeIds: string[]) => void;
  removeNodesFromGroup: (groupId: string, nodeIds: string[]) => void;
  toggleGroupCollapse: (groupId: string) => void;

  // Utility
  getNode: (id: string) => WorkflowNode | undefined;
  getEdge: (id: string) => WorkflowEdge | undefined;
  getConnectedNodes: (nodeId: string) => WorkflowNode[];

  // Recording Actions
  createNodeFromRecording: (audioBlob: Blob, transcript: string, duration: number) => WorkflowNode;

  // History Actions
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  pushHistory: () => void;
}

const createDefaultWorkflow = (name: string, description?: string): Workflow => ({
  id: crypto.randomUUID(),
  name,
  description,
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  metadata: {
    version: '1.0.0',
    tags: [],
    isPublic: false,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const createDefaultNodeData = (type: NodeType): NodeData => {
  switch (type) {
    case 'pdf':
      return {
        parseStatus: 'idle',
      } as NodeData;
    case 'voice':
      return {
        transcriptStatus: 'idle',
        uploadStatus: 'idle',
      } as NodeData;
    case 'image':
      return {
        analysisStatus: 'idle',
      } as NodeData;
    case 'text':
      return {
        content: '',
        contentType: 'plain',
      } as NodeData;
    case 'mindmap':
      return {
        concept: '',
        tags: [],
      } as NodeData;
    case 'template':
      return {
        templateType: 'custom',
        generationStatus: 'idle',
      } as NodeData;
    case 'webpage':
      return {
        url: '',
        scrapeStatus: 'idle',
      } as NodeData;
    case 'chat':
      return {
        messages: [],
        linkedNodes: [],
        model: 'gemini-2.5-flash',
        contextWindow: [],
      } as NodeData;
    case 'connector':
      return {
        relationshipType: 'workflow',
      } as NodeData;
    case 'group':
      return {
        groupedNodes: [],
        collapsed: false,
        groupChatEnabled: false,
      } as NodeData;
    default:
      return {} as NodeData;
  }
};

export const useWorkflowStore = create<WorkflowStore>()(
  immer((set, get) => ({
    // Initial State
    workflow: null,
    selectedNodes: [],
    selectedEdges: [],
    clipboard: [],
    history: [],
    historyIndex: -1,
    isSaving: false,
    saveError: null,
    lastSaved: null,

    // Workflow Actions
    createWorkflow: (name, description) => {
      set((state) => {
        state.workflow = createDefaultWorkflow(name, description);
      });
    },

    loadWorkflow: (workflow) => {
      set((state) => {
        state.workflow = workflow;
        state.selectedNodes = [];
        state.selectedEdges = [];
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
        state.isSaving = false;
        state.saveError = null;
        state.lastSaved = null;
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
          state.saveError = error instanceof Error ? error.message : 'Failed to save workflow';
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

      const node: WorkflowNode = {
        id: crypto.randomUUID(),
        type,
        position,
        data: { ...createDefaultNodeData(type), ...data },
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
          state.workflow.nodes = state.workflow.nodes.filter((n) => n.id !== id);
          state.workflow.edges = state.workflow.edges.filter(
            (e) => e.source !== id && e.target !== id
          );
          state.selectedNodes = state.selectedNodes.filter((nId) => nId !== id);
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
          state.workflow.nodes = state.workflow.nodes.filter((n) => !ids.includes(n.id));
          state.workflow.edges = state.workflow.edges.filter(
            (e) => !ids.includes(e.source) && !ids.includes(e.target)
          );
          state.selectedNodes = state.selectedNodes.filter((nId) => !ids.includes(nId));
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
            if (duplicate.type === 'group' && 'groupedNodes' in duplicate.data) {
              duplicate.data.groupedNodes = [];
            }
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
        type: 'default',
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
          state.workflow.edges = state.workflow.edges.filter((e) => e.id !== id);
          state.selectedEdges = state.selectedEdges.filter((eId) => eId !== id);
          state.workflow.updatedAt = new Date().toISOString();
        }
      });
    },

    deleteEdges: (ids) => {
      set((state) => {
        if (state.workflow) {
          state.workflow.edges = state.workflow.edges.filter((e) => !ids.includes(e.id));
          state.selectedEdges = state.selectedEdges.filter((eId) => !ids.includes(eId));
          state.workflow.updatedAt = new Date().toISOString();
        }
      });
    },

    // Selection Actions
    selectNode: (id, multi = false) => {
      set((state) => {
        if (multi) {
          if (state.selectedNodes.includes(id)) {
            state.selectedNodes = state.selectedNodes.filter((nId) => nId !== id);
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
            state.selectedEdges = state.selectedEdges.filter((eId) => eId !== id);
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
          const offset = position ? position : { x: 50, y: 50 };
          const newNodes = state.clipboard.map((node) => {
            const clone = deepClone(node);
            clone.id = crypto.randomUUID();
            clone.position = {
              x: node.position.x + offset.x,
              y: node.position.y + offset.y,
            };
            if (clone.type === 'group' && 'groupedNodes' in clone.data) {
              clone.data.groupedNodes = [];
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

    // Group Actions
    createGroup: (nodeIds, position) => {
      set((state) => {
        if (state.workflow) {
          const existingIds = new Set(state.workflow.nodes.map((n) => n.id));
          const uniqueIds = Array.from(new Set(nodeIds)).filter((nodeId) => existingIds.has(nodeId) && nodeId);

          const groupNode: WorkflowNode = {
            id: crypto.randomUUID(),
            type: 'group',
            position,
            data: {
              groupedNodes: uniqueIds,
              collapsed: false,
              groupChatEnabled: true,
              groupChatMessages: [],
            } as NodeData,
          };
          state.workflow.nodes.push(groupNode);
          state.workflow.updatedAt = new Date().toISOString();
          state.selectedNodes = [groupNode.id];
          state.selectedEdges = [];
        }
      });
    },

    addNodesToGroup: (groupId, nodeIds) => {
      set((state) => {
        if (state.workflow) {
          const groupNode = state.workflow.nodes.find((n) => n.id === groupId && n.type === 'group');
          if (groupNode && 'groupedNodes' in groupNode.data) {
            const existingNodes = new Set(groupNode.data.groupedNodes || []);
            nodeIds.forEach((nodeId) => {
              if (nodeId && nodeId !== groupId) {
                existingNodes.add(nodeId);
              }
            });
            groupNode.data.groupedNodes = Array.from(existingNodes);
            state.workflow.updatedAt = new Date().toISOString();
          }
        }
      });
    },

    removeNodesFromGroup: (groupId, nodeIds) => {
      set((state) => {
        if (state.workflow) {
          const groupNode = state.workflow.nodes.find((n) => n.id === groupId && n.type === 'group');
          if (groupNode && 'groupedNodes' in groupNode.data) {
            groupNode.data.groupedNodes = (groupNode.data.groupedNodes || []).filter(
              (id) => !nodeIds.includes(id)
            );
            state.workflow.updatedAt = new Date().toISOString();
          }
        }
      });
    },

    toggleGroupCollapse: (groupId) => {
      set((state) => {
        if (state.workflow) {
          const groupNode = state.workflow.nodes.find((n) => n.id === groupId && n.type === 'group');
          if (groupNode && 'collapsed' in groupNode.data) {
            groupNode.data.collapsed = !groupNode.data.collapsed;
            state.workflow.updatedAt = new Date().toISOString();
          }
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
        throw new Error('No active workflow');
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
      const node = addNode('voice', basePosition, {
        audioUrl,
        transcript,
        duration,
        transcriptStatus: 'success',
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

        // Limit history to 50 items
        if (state.history.length > 50) {
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
  }))
);
