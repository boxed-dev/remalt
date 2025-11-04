import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';
import type { ReactNode, CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
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
  style?: CSSProperties;
  contentClassName?: string;
  contentStyle?: CSSProperties;
}

export function BaseNode({
  id,
  type: _type,
  icon: _icon,
  iconBg: _iconBg = 'bg-gray-100',
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
  style,
  contentClassName,
  contentStyle,
}: BaseNodeProps) {
  void _type;
  void _icon;
  void _iconBg;
  // Node activation system
  const activeNodeId = useWorkflowStore((state) => state.activeNodeId);
  const setActiveNode = useWorkflowStore((state) => state.setActiveNode);
  const isActive = activeNodeId === id;

  // Get the actual parentId from React Flow's internal state
  // This is more reliable than relying on props which may not be passed correctly
  const { getNode } = useReactFlow();
  const node = getNode(id);
  const actualParentId = node?.parentId || parentId || parentNode;

  const handlePointerDownActivate = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const isPrimaryPointer = event.pointerType === 'touch' || event.button === 0;
    if (!isPrimaryPointer) {
      return;
    }

    if (!isActive) {
      setActiveNode(id);
    }
  }, [id, isActive, setActiveNode]);

  // Hide handles when node is inside a group
  // Use actualParentId from React Flow's getNode() for reliable parent detection
  const isChildOfGroup = !!actualParentId;
  const shouldShowSourceHandle = showSourceHandle && !isChildOfGroup;
  const shouldShowTargetHandle = showTargetHandle && !isChildOfGroup;
  // Connection targeting highlight state
  const isConnecting = useWorkflowStore((state) => state.isConnecting);
  const connectHoveredTargetId = useWorkflowStore((state) => state.connectHoveredTargetId);
  const connectPreviewTargetId = useWorkflowStore((state) => state.connectPreviewTargetId);
  const isConnectTarget = isConnecting && connectHoveredTargetId === id;
  const isPreviewTarget = isConnecting && connectPreviewTargetId === id && !isConnectTarget;
  return (
    <div
      className={`flowy-node min-w-[280px] rounded-2xl bg-white transition-all duration-200 ${
        allowOverflow ? 'relative' : 'overflow-hidden relative'
      } ${
        className
          ? className
          : `border-2 shadow-md hover:shadow-xl ${
              isActive ? '!border-[#095D40]' : 'border-[#E8ECEF] hover:border-[#D1D5DB]'
            }`
      } ${isConnectTarget ? 'flowy-magnetic-node' : ''} ${isPreviewTarget ? 'flowy-preview-node' : ''}`}
      style={style}
      onPointerDownCapture={handlePointerDownActivate}
    >
      {/* Content */}
      <div
        className={`relative z-0 ${contentClassName ?? 'p-5'}`}
        style={contentStyle}
      >
        {children}
      </div>

      {/* Primary Target Handle - Default LEFT for side connections */}
      {shouldShowTargetHandle && (
        <Handle
          type="target"
          position={targetHandlePosition}
          className={`flowy-handle flowy-handle-target !w-3.5 !h-3.5 !bg-white !border-2 !border-[#9CA3AF] hover:!border-[#095D40] !transition-all !duration-150 !z-50 ${isConnectTarget ? 'flowy-magnetic-handle' : ''} ${isPreviewTarget ? 'flowy-preview-handle' : ''}`}
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
          className="flowy-handle flowy-handle-source !w-3.5 !h-3.5 !bg-white !border-2 !border-[#9CA3AF] hover:!border-[#095D40] !transition-all !duration-150 !z-50"
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
          className={`flowy-handle flowy-handle-target !w-3.5 !h-3.5 !bg-white !border-2 !border-[#9CA3AF] hover:!border-[#095D40] !transition-all !duration-150 !z-50 ${isConnectTarget ? 'flowy-magnetic-handle' : ''} ${isPreviewTarget ? 'flowy-preview-handle' : ''}`}
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
          className="flowy-handle flowy-handle-source !w-3.5 !h-3.5 !bg-white !border-2 !border-[#9CA3AF] hover:!border-[#095D40] !transition-all !duration-150 !z-50"
          style={handle.style}
        />
      ))}
    </div>
  );
}
