import { Handle, Position } from '@xyflow/react';
import type { ReactNode, CSSProperties } from 'react';

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
}

export function BaseNode({
  id,
  type,
  icon,
  iconBg = 'bg-gray-100',
  children,
  showSourceHandle = true,
  showTargetHandle = true,
  allowOverflow = false,
  sourceHandlePosition = Position.Right,
  targetHandlePosition = Position.Left,
  sourceHandles,
  targetHandles,
}: BaseNodeProps) {
  return (
    <div
      className={`min-w-[240px] rounded-2xl bg-white border border-[#E8ECEF] hover:border-[#D1D5DB] shadow-sm hover:shadow-lg transition-all duration-200 ${
        allowOverflow ? '' : 'overflow-hidden'
      }`}
    >
      {/* Content */}
      <div className="p-4">{children}</div>

      {/* Primary Target Handle - Default LEFT for side connections */}
      {showTargetHandle && (
        <Handle
          type="target"
          position={targetHandlePosition}
          className="!w-2.5 !h-2.5 !bg-white !border-2 !border-[#9CA3AF] hover:!border-[#155EEF] hover:!scale-125 !transition-all !duration-150"
          style={{
            ...(targetHandlePosition === Position.Left && { left: '-5px' }),
            ...(targetHandlePosition === Position.Right && { right: '-5px' }),
          }}
        />
      )}

      {/* Primary Source Handle - Default RIGHT for side connections */}
      {showSourceHandle && (
        <Handle
          type="source"
          position={sourceHandlePosition}
          className="!w-2.5 !h-2.5 !bg-white !border-2 !border-[#9CA3AF] hover:!border-[#155EEF] hover:!scale-125 !transition-all !duration-150"
          style={{
            ...(sourceHandlePosition === Position.Left && { left: '-5px' }),
            ...(sourceHandlePosition === Position.Right && { right: '-5px' }),
          }}
        />
      )}

      {/* Additional target handles */}
      {targetHandles?.map((handle) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type="target"
          position={handle.position}
          className="!w-2.5 !h-2.5 !bg-white !border-2 !border-[#9CA3AF] hover:!border-[#155EEF] hover:!scale-125 !transition-all !duration-150"
          style={handle.style}
        />
      ))}

      {/* Additional source handles */}
      {sourceHandles?.map((handle) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type="source"
          position={handle.position}
          className="!w-2.5 !h-2.5 !bg-white !border-2 !border-[#9CA3AF] hover:!border-[#155EEF] hover:!scale-125 !transition-all !duration-150"
          style={handle.style}
        />
      ))}
    </div>
  );
}
