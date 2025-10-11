import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { NodeResizer, Handle, Position } from '@xyflow/react';
import { GripHorizontal, Folder, Pencil, Check, Move } from 'lucide-react';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import type { GroupNodeData } from '@/types/workflow';

interface GroupNodeProps {
  id: string;
  data: GroupNodeData;
}

export const GroupNode = memo(({ id, data }: GroupNodeProps) => {
  const updateNode = useWorkflowStore((s) => s.updateNode);
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const getNode = useWorkflowStore((s) => s.getNode);

  const node = getNode(id);
  const width = node?.style?.width ?? 640;
  const height = node?.style?.height ?? 420;

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(data.title || '');
  const inputRef = useRef<HTMLInputElement>(null);

  const [localDragOver, setLocalDragOver] = useState(false);

  const saveTitle = useCallback(() => {
    const trimmed = titleInput.trim();
    updateNodeData(id, { title: trimmed || undefined } as Partial<GroupNodeData>);
    setIsEditingTitle(false);
  }, [id, titleInput, updateNodeData]);

  const onResizeStop = useCallback(
    (_e: any, _dir: any, ref: HTMLElement) => {
      const newWidth = parseFloat(ref.style.width);
      const newHeight = parseFloat(ref.style.height);
      updateNode(id, { style: { ...(node?.style || {}), width: newWidth, height: newHeight } });
    },
    [id, node?.style, updateNode]
  );

  const isDragOver = (data as any)?.isDragOver || localDragOver;
  const borderClass = useMemo(() => {
    if (isDragOver) return 'border-2 border-[#2563EB] border-dashed shadow-lg';
    return 'border border-[#E0E0E0]';
  }, [isDragOver]);

  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="rounded-xl bg-[#F7F7F7]/80 shadow-[0_4px_12px_rgba(0,0,0,0.08)] relative"
      style={{ width, height, zIndex: 1 }}
      onDragEnter={() => setLocalDragOver(true)}
      onDragLeave={() => setLocalDragOver(false)}
      onDrop={() => setLocalDragOver(false)}
    >
      <NodeResizer
        minWidth={360}
        minHeight={220}
        color="#0F172A"
        handleClassName="!w-3 !h-3 !bg-white !border-2 !border-[#0F172A]"
        lineClassName="!border-[#0F172A]"
        onResizeEnd={() => {
          const el = containerRef.current;
          const newW = el ? el.clientWidth : width;
          const newH = el ? el.clientHeight : height;
          updateNode(id, { style: { ...(node?.style || {}), width: newW, height: newH } });
        }}
      />
      {/* Header - acts as group drag handle via React Flow parent container */}
      <div
        className={`flex items-center justify-between px-4 py-2 rounded-t-xl bg-[#0F172A] text-white ${borderClass}`}
        style={{ borderBottom: '1px solid #0F172A' }}
      >
        <div className="flex items-center gap-2 text-[#0F172A]">
          <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center">
            <Folder className="w-3.5 h-3.5 text-[#0F172A]" />
          </div>
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTitle();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
                className="px-2 py-1 text-[13px] rounded border border-white/40 bg-white/95 focus:outline-none focus:ring-2 focus:ring-white/70 text-[#0F172A]"
                placeholder="Group name"
              />
              <button onClick={saveTitle} className="p-1 rounded bg-white border border-white/40">
                <Check className="w-4 h-4 text-[#0F172A]" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold tracking-wide text-white">
                {data.title || 'Group'}
              </span>
              <button onClick={() => setIsEditingTitle(true)} className="p-1 rounded hover:bg-white/20">
                <Pencil className="w-4 h-4 text-white/90" />
              </button>
            </div>
          )}
        </div>

        <GripHorizontal className="w-4 h-4 text-white/80" />
      </div>

      {/* Content area is intentionally empty; children render via React Flow nested nodes */}
      <div className={`relative w-full h-[calc(100%-40px)] rounded-b-xl bg-white ${borderClass}`} />

      {/* Allow connectors so group can link to Chat or others */}
      <Handle type="target" position={Position.Left} className="!w-3.5 !h-3.5 !bg-white !border-2 !border-[#9CA3AF]" style={{ left: -7 }} />
      <Handle type="source" position={Position.Right} className="!w-3.5 !h-3.5 !bg-white !border-2 !border-[#9CA3AF]" style={{ right: -7 }} />
    </div>
  );
});


