import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';
import type { ReactNode, CSSProperties, PointerEvent as ReactPointerEvent } from 'react';

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
  selected?: boolean; // React Flow native selection state
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
  header?: ReactNode;
  headerClassName?: string;
  contentClassName?: string;
  contentStyle?: CSSProperties;
  // Performance optimization: pass connection state as props instead of subscribing
  isConnectTarget?: boolean;
  isPreviewTarget?: boolean;
}

export function BaseNode({
  id,
  type: _type,
  icon: _icon,
  iconBg: _iconBg = 'bg-gray-100',
  children,
  selected,
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
  header,
  headerClassName,
  contentClassName,
  contentStyle,
  isConnectTarget = false,
  isPreviewTarget = false,
}: BaseNodeProps) {
  void _type;
  void _icon;
  void _iconBg;

  // Get the actual parentId from React Flow's internal state
  // This is more reliable than relying on props which may not be passed correctly
  const { getNode } = useReactFlow();
  const node = getNode(id);
  const actualParentId = node?.parentId || parentId || parentNode;

  // Hide handles when node is inside a group
  // Use actualParentId from React Flow's getNode() for reliable parent detection
  const isChildOfGroup = !!actualParentId;
  const shouldShowSourceHandle = showSourceHandle && !isChildOfGroup;
  const shouldShowTargetHandle = showTargetHandle && !isChildOfGroup;
  const hasHeader = Boolean(header);
  return (
    <div
      data-flowy-selected={selected ? 'true' : 'false'}
      className={`flowy-node min-w-[280px] min-h-[200px] flex flex-col rounded-2xl bg-white transition-all duration-200 ${
        allowOverflow ? 'relative' : 'overflow-hidden relative'
      } ${
        className
          ? className
          : `border border-[#E6E8EC] shadow-sm hover:shadow-md ${
              selected ? '!border-[#0F766E]' : 'hover:border-[#CBD5F0]'
            }`
      } ${isConnectTarget ? 'flowy-magnetic-node' : ''} ${isPreviewTarget ? 'flowy-preview-node' : ''}`}
      style={style}
    >
      {header && (
        <div className={`flex-shrink-0 ${headerClassName}`}>{header}</div>
      )}
      {/* Content */}
      <div
        className={`relative z-0 flex-1 overflow-hidden ${
          contentClassName ?? (hasHeader ? 'px-5 pb-5 pt-4' : 'p-5')
        }`}
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
