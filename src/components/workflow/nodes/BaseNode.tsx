import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { ReactNode, CSSProperties } from 'react';
import { useWorkflowStore } from '@/lib/stores/workflow-store';

interface HandleConfig {
  id: string;
  position: Position;
  style?: CSSProperties;
}

interface BaseNodeProps {
  id: string;
  type?: string;
  icon?: ReactNode;
  iconBg?: string;
  children: ReactNode;
  showSourceHandle?: boolean;
  showTargetHandle?: boolean;
  // NEW: Control overflow behavior for scrollable content
  allowOverflow?: boolean;
  // NEW: Flexible handle positioning (default: Left/Right for side connections)
  sourceHandlePosition?: Position;
  targetHandlePosition?: Position;
  // NEW: Multiple handles support
  sourceHandles?: HandleConfig[];
  targetHandles?: HandleConfig[];
  // NEW: Parent group detection for hiding handles
  // Support both parentId (current) and parentNode (legacy) for React Flow compatibility
  parentId?: string | null;
  parentNode?: string | null;
  className?: string;
}

export function BaseNode({
  id,
  type,
  icon,
  iconBg = 'bg-gray-100',
  children,
  showSourceHandle = true,
  showTargetHandle = false, // Changed default to false - most nodes only need source handle
  allowOverflow = true, // Changed to true to allow handles to extend outside node boundary
  sourceHandlePosition = Position.Right,
  targetHandlePosition = Position.Left,
  sourceHandles,
  targetHandles,
  parentId,
  parentNode,
  className,
}: BaseNodeProps) {
  // Node activation system
  const activeNodeId = useWorkflowStore((state) => state.activeNodeId);
  const setActiveNode = useWorkflowStore((state) => state.setActiveNode);
  const isActive = activeNodeId === id;
  
  // Get the actual parentId from React Flow's internal state
  // This is more reliable than relying on props which may not be passed correctly
  const { getNode } = useReactFlow();
  const node = getNode(id);
  const actualParentId = node?.parentId || parentId || parentNode;

  const handleActivationClick = (e: React.MouseEvent) => {
    if (!isActive) {
      e.stopPropagation();

      // Activate the node
      setActiveNode(id);

      // Find the element underneath the overlay at click position
      const overlay = e.currentTarget as HTMLElement;
      overlay.style.pointerEvents = 'none';
      const targetElement = document.elementFromPoint(e.clientX, e.clientY);
      overlay.style.pointerEvents = 'auto';

      // Simulate click on the underlying element after a brief moment to allow React to re-render
      if (targetElement && targetElement !== overlay) {
        setTimeout(() => {
          if (targetElement instanceof HTMLElement) {
            targetElement.click();
          }
        }, 0);
      }
    }
  };

  // Hide handles when node is inside a group
  // Use actualParentId from React Flow's getNode() for reliable parent detection
  const isChildOfGroup = !!actualParentId;
  const shouldShowSourceHandle = showSourceHandle && !isChildOfGroup;
  const shouldShowTargetHandle = showTargetHandle && !isChildOfGroup;
  // Connection targeting highlight state
  const isConnecting = useWorkflowStore((state) => state.isConnecting);
  const connectHoveredTargetId = useWorkflowStore((state) => state.connectHoveredTargetId);
  const isConnectTarget = isConnecting && connectHoveredTargetId === id;
  return (
    <div
      className={`min-w-[280px] rounded-2xl bg-white transition-all duration-200 ${
        allowOverflow ? 'relative' : 'overflow-hidden relative'
      } ${
        className || 'border-2 border-[#E8ECEF] hover:border-[#D1D5DB] shadow-md hover:shadow-xl'
      }`}
    >
      {/* Activation overlay for inactive nodes - blocks interaction until activated */}
      {!isActive && (
        <div
          onClick={handleActivationClick}
          className="absolute inset-0 z-10 cursor-pointer rounded-2xl"
        />
      )}

      {/* Content */}
      <div className="p-5 relative z-0">
        {children}
      </div>

      {/* Primary Target Handle - Default LEFT for side connections */}
      {shouldShowTargetHandle && (
        <Handle
          type="target"
          position={targetHandlePosition}
          className={`!w-3.5 !h-3.5 !bg-white !border-2 !border-[#9CA3AF] hover:!border-[#155EEF] !transition-all !duration-150 !z-50 ${isConnectTarget ? 'flowy-bh-handle' : ''}`}
          style={{
            ...(targetHandlePosition === Position.Left && { left: '-7px' }),
            ...(targetHandlePosition === Position.Right && { right: '-7px' }),
          }}
        />
      )}

      {/* Primary Source Handle - Default RIGHT for side connections */}
      {shouldShowSourceHandle && (
        <Handle
          type="source"
          position={sourceHandlePosition}
          className="!w-3.5 !h-3.5 !bg-white !border-2 !border-[#9CA3AF] hover:!border-[#155EEF] !transition-all !duration-150 !z-50"
          style={{
            ...(sourceHandlePosition === Position.Left && { left: '-7px' }),
            ...(sourceHandlePosition === Position.Right && { right: '-7px' }),
          }}
        />
      )}

      {/* Additional target handles - also hidden when in group */}
      {shouldShowTargetHandle && targetHandles?.map((handle) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type="target"
          position={handle.position}
          className={`!w-3.5 !h-3.5 !bg-white !border-2 !border-[#9CA3AF] hover:!border-[#155EEF] !transition-all !duration-150 !z-50 ${isConnectTarget ? 'flowy-bh-handle' : ''}`}
          style={handle.style}
        />
      ))}

      {/* Additional source handles - also hidden when in group */}
      {shouldShowSourceHandle && sourceHandles?.map((handle) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type="source"
          position={handle.position}
          className="!w-3.5 !h-3.5 !bg-white !border-2 !border-[#9CA3AF] hover:!border-[#155EEF] !transition-all !duration-150 !z-50"
          style={handle.style}
        />
      ))}
    </div>
  );
}
