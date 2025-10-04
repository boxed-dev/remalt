'use client';

import { useState, useEffect } from 'react';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { Button } from '@/components/ui/button';
import { X, Trash2 } from 'lucide-react';
import type {
  WorkflowNode,
  TextNodeData,
  YouTubeNodeData,
  ChatNodeData,
  GroupNodeData,
} from '@/types/workflow';

export function WorkflowPropertiesPanel() {
  const workflow = useWorkflowStore((state) => state.workflow);
  const selectedNodes = useWorkflowStore((state) => state.selectedNodes);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const deleteNode = useWorkflowStore((state) => state.deleteNode);
  const clearSelection = useWorkflowStore((state) => state.clearSelection);

  const [isOpen, setIsOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);

  useEffect(() => {
    if (selectedNodes.length === 1 && workflow) {
      const node = workflow.nodes.find((n) => n.id === selectedNodes[0]);
      if (node) {
        setSelectedNode(node);
        setIsOpen(true);
      }
    } else {
      setIsOpen(false);
      setSelectedNode(null);
    }
  }, [selectedNodes, workflow]);

  const handleClose = () => {
    clearSelection();
    setIsOpen(false);
  };

  const handleDelete = () => {
    if (selectedNode) {
      deleteNode(selectedNode.id);
      handleClose();
    }
  };

  if (!isOpen || !selectedNode) {
    return null;
  }

  return (
    <aside
      className="w-80 h-full bg-white border-l border-[#E8ECEF] flex flex-col animate-in slide-in-from-right duration-200"
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro", system-ui, sans-serif',
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#E8ECEF] flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-[#1A1D21]">Node Properties</h2>
          <p className="text-[12px] text-[#9CA3AF] capitalize">{selectedNode.type}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="h-8 w-8 rounded-lg hover:bg-[#F5F5F7] text-[#6B7280]"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Node-specific properties */}
        {selectedNode.type === 'text' && (
          <TextNodeProperties nodeId={selectedNode.id} data={selectedNode.data as TextNodeData} />
        )}
        {selectedNode.type === 'youtube' && (
          <YouTubeNodeProperties nodeId={selectedNode.id} data={selectedNode.data as YouTubeNodeData} />
        )}
        {selectedNode.type === 'chat' && (
          <ChatNodeProperties nodeId={selectedNode.id} data={selectedNode.data as ChatNodeData} />
        )}
        {selectedNode.type === 'group' && (
          <GroupNodeProperties
            nodeId={selectedNode.id}
            data={selectedNode.data as GroupNodeData}
            workflowNodes={workflow?.nodes || []}
          />
        )}
        {/* Add more node types as needed */}
      </div>

      {/* Footer - Actions */}
      <div className="px-4 py-3 border-t border-[#E8ECEF]">
        <Button
          onClick={handleDelete}
          variant="outline"
          className="w-full border-[#FF3B30] text-[#FF3B30] hover:bg-[#FF3B30] hover:text-white transition-all duration-150"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Node
        </Button>
      </div>
    </aside>
  );
}

// Text Node Properties
function TextNodeProperties({ nodeId, data }: { nodeId: string; data: TextNodeData }) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[13px] font-medium text-[#1A1D21] mb-2">Content Type</label>
        <select
          value={data.contentType}
          onChange={(e) => updateNodeData(nodeId, { contentType: e.target.value as 'plain' | 'markdown' | 'html' })}
          className="w-full px-3 py-2 text-[13px] border border-[#E8ECEF] rounded-lg focus:outline-none focus:ring-[1.5px] focus:ring-[#007AFF] bg-white"
        >
          <option value="plain">Plain Text</option>
          <option value="markdown">Markdown</option>
          <option value="html">HTML</option>
        </select>
      </div>

      <div>
        <label className="block text-[13px] font-medium text-[#1A1D21] mb-2">Text Content</label>
        <textarea
          value={data.content}
          onChange={(e) => updateNodeData(nodeId, { content: e.target.value })}
          placeholder="Enter your text here..."
          className="w-full px-3 py-2 text-[13px] border border-[#E8ECEF] rounded-lg focus:outline-none focus:ring-[1.5px] focus:ring-[#007AFF] bg-white min-h-[120px] resize-y"
        />
      </div>
    </div>
  );
}

// YouTube Node Properties
function YouTubeNodeProperties({ nodeId, data }: { nodeId: string; data: YouTubeNodeData }) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[13px] font-medium text-[#1A1D21] mb-2">Video URL</label>
        <input
          type="text"
          value={data.url}
          onChange={(e) => updateNodeData(nodeId, { url: e.target.value })}
          placeholder="https://youtube.com/watch?v=..."
          className="w-full px-3 py-2 text-[13px] border border-[#E8ECEF] rounded-lg focus:outline-none focus:ring-[1.5px] focus:ring-[#007AFF] bg-white"
        />
      </div>

      {data.videoId && (
        <>
          <div>
            <label className="block text-[13px] font-medium text-[#1A1D21] mb-2">Video ID</label>
            <div className="px-3 py-2 text-[13px] bg-[#F5F5F7] rounded-lg font-mono text-[#6B7280]">
              {data.videoId}
            </div>
          </div>

          {data.transcriptStatus === 'success' && data.transcript && (
            <div>
              <label className="block text-[13px] font-medium text-[#1A1D21] mb-2">
                Transcript ({Math.round(data.transcript.length / 1000)}K chars)
              </label>
              <div className="px-3 py-2 text-[11px] bg-[#F5F5F7] rounded-lg font-mono text-[#6B7280] max-h-[200px] overflow-y-auto">
                {data.transcript.substring(0, 500)}...
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Chat Node Properties
function ChatNodeProperties({ nodeId, data }: { nodeId: string; data: ChatNodeData }) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[13px] font-medium text-[#1A1D21] mb-2">AI Model</label>
        <select
          value={data.model}
          onChange={(e) => updateNodeData(nodeId, { model: e.target.value as 'gemini-2.5-flash' | 'gemini-2.5-pro' })}
          className="w-full px-3 py-2 text-[13px] border border-[#E8ECEF] rounded-lg focus:outline-none focus:ring-[1.5px] focus:ring-[#007AFF] bg-white"
        >
          <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
          <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
        </select>
      </div>

      <div>
        <label className="block text-[13px] font-medium text-[#1A1D21] mb-2">System Prompt</label>
        <textarea
          value={data.systemPrompt || ''}
          onChange={(e) => updateNodeData(nodeId, { systemPrompt: e.target.value })}
          placeholder="Set the AI's behavior and context..."
          className="w-full px-3 py-2 text-[13px] border border-[#E8ECEF] rounded-lg focus:outline-none focus:ring-[1.5px] focus:ring-[#007AFF] bg-white min-h-[100px] resize-y"
        />
      </div>

      <div>
        <label className="block text-[13px] font-medium text-[#1A1D21] mb-2">
          Message History ({data.messages.length})
        </label>
        <div className="text-[12px] text-[#6B7280] bg-[#F5F5F7] px-3 py-2 rounded-lg">
          {data.messages.length === 0 ? (
            <span className="italic">No messages yet</span>
          ) : (
            <span>{data.messages[data.messages.length - 1].content.substring(0, 100)}...</span>
          )}
        </div>
      </div>

      {data.linkedNodes.length > 0 && (
        <div>
          <label className="block text-[13px] font-medium text-[#1A1D21] mb-2">
            Connected Sources ({data.linkedNodes.length})
          </label>
          <div className="flex flex-wrap gap-1.5">
            {data.linkedNodes.map((nodeId) => (
              <span
                key={nodeId}
                className="px-2 py-1 text-[11px] bg-[#007AFF]/10 text-[#007AFF] rounded-md font-medium"
              >
                {nodeId.substring(0, 8)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Group Node Properties
function GroupNodeProperties({
  nodeId,
  data,
  workflowNodes,
}: {
  nodeId: string;
  data: GroupNodeData;
  workflowNodes: WorkflowNode[];
}) {
  const addNodesToGroup = useWorkflowStore((state) => state.addNodesToGroup);
  const removeNodesFromGroup = useWorkflowStore((state) => state.removeNodesFromGroup);

  const groupedNodes = data.groupedNodes || [];
  const availableNodes = workflowNodes.filter((node) =>
    node.id !== nodeId && node.type !== 'group' && !groupedNodes.includes(node.id)
  );

  const handleAddNode = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (!value) return;
    addNodesToGroup(nodeId, [value]);
    event.target.value = '';
  };

  const handleRemoveNode = (id: string) => {
    removeNodesFromGroup(nodeId, [id]);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[13px] font-medium text-[#1A1D21] mb-2">Group Members</label>
        {groupedNodes.length === 0 ? (
          <div className="text-[12px] text-[#6B7280] bg-[#F5F5F7] px-3 py-2 rounded-lg">
            No nodes added yet. Connect nodes to this group to share their context.
          </div>
        ) : (
          <div className="space-y-2">
            {groupedNodes.map((memberId) => {
              const member = workflowNodes.find((node) => node.id === memberId);
              return (
                <div
                  key={memberId}
                  className="flex items-center justify-between px-3 py-2 border border-[#E8ECEF] rounded-lg bg-[#F9FAFB]"
                >
                  <div>
                    <div className="text-[12px] font-medium text-[#1A1D21]">
                      {member?.type || 'Node'}
                    </div>
                    <div className="text-[11px] text-[#6B7280] font-mono">{memberId.slice(0, 8)}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveNode(memberId)}
                    className="h-7 px-2 text-[#B91C1C] hover:text-[#991B1B]"
                  >
                    <span className="text-[11px] font-medium">Remove</span>
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <label className="block text-[13px] font-medium text-[#1A1D21] mb-2">Add Nodes</label>
        <select
          defaultValue=""
          onChange={handleAddNode}
          className="w-full px-3 py-2 text-[13px] border border-[#E8ECEF] rounded-lg focus:outline-none focus:ring-[1.5px] focus:ring-[#007AFF] bg-white"
        >
          <option value="" disabled>
            Select a node to add
          </option>
          {availableNodes.length === 0 && (
            <option value="" disabled>
              No eligible nodes available
            </option>
          )}
          {availableNodes.map((node) => (
            <option key={node.id} value={node.id}>
              {node.type} — {node.id.slice(0, 8)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
