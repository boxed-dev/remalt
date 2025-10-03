import { Badge } from "@/components/ui/badge";
import { Flow } from "@/lib/mock-data/flows";
import { Clock, Trash2, MoreVertical } from "lucide-react";
import { useState } from "react";

interface FlowCardProps {
  flow: Flow;
  onClick?: () => void;
  onDelete?: () => void;
}

export function FlowCard({ flow, onClick, onDelete }: FlowCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Format date nicely
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return date.toLocaleDateString();
  };

  const lastEdited = flow.lastEdited instanceof Date ? flow.lastEdited : new Date(flow.lastEdited);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const confirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    }
    setShowDeleteConfirm(false);
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  return (
    <div
      onClick={onClick}
      className="group relative border border-[#E8ECEF] rounded-xl p-6 hover:border-[#007AFF] hover:shadow-[0_4px_16px_rgba(0,122,255,0.12)] hover:-translate-y-1 transition-all duration-200 cursor-pointer bg-white"
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro", system-ui, sans-serif'
      }}
    >
      {/* Delete Confirmation Overlay */}
      {showDeleteConfirm && (
        <div
          className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-6 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <Trash2 className="h-8 w-8 text-[#FF3B30] mb-3" />
          <h4 className="text-[15px] font-semibold text-[#1A1D21] mb-2">Delete Workflow?</h4>
          <p className="text-[13px] text-[#6B7280] mb-6 text-center">
            This action cannot be undone.
          </p>
          <div className="flex gap-2 w-full">
            <button
              onClick={cancelDelete}
              className="flex-1 px-4 py-2 rounded-lg border border-[#E8ECEF] text-[13px] font-medium text-[#1A1D21] hover:bg-[#F5F5F7] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="flex-1 px-4 py-2 rounded-lg bg-[#FF3B30] text-[13px] font-medium text-white hover:bg-[#FF2D1F] transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Delete Button */}
      {onDelete && (
        <button
          onClick={handleDelete}
          className="absolute top-3 right-3 p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[#FF3B30]/10 transition-all duration-200 z-[5]"
          title="Delete workflow"
        >
          <Trash2 className="h-4 w-4 text-[#FF3B30]" />
        </button>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 pr-8">
          <h3 className="font-semibold text-[16px] mb-1 text-[#1A1D21] truncate group-hover:text-[#007AFF] transition-colors">
            {flow.name}
          </h3>
          {flow.description && (
            <p className="text-[13px] text-[#6B7280] line-clamp-2">
              {flow.description}
            </p>
          )}
        </div>
      </div>

      {/* Node Count */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1.5">
          <svg className="h-4 w-4 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          <span className="text-[12px] text-[#6B7280] font-medium">
            {flow.nodeCount || 0} {flow.nodeCount === 1 ? 'node' : 'nodes'}
          </span>
        </div>
      </div>

      {/* Tags */}
      {flow.tags && flow.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {flow.tags.slice(0, 3).map((tag) => (
            <span
              key={tag.name}
              className="px-2.5 py-1 rounded-full bg-[#F5F5F7] text-[11px] font-medium text-[#6B7280] hover:bg-[#E8ECEF] transition-colors"
            >
              {tag.name}
            </span>
          ))}
          {flow.tags.length > 3 && (
            <span className="px-2.5 py-1 rounded-full bg-[#F5F5F7] text-[11px] font-medium text-[#6B7280]">
              +{flow.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-[#E8ECEF]">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-[#9CA3AF]" />
          <span className="text-[12px] text-[#9CA3AF]">
            {formatDate(lastEdited)}
          </span>
        </div>
        <div className="text-[11px] text-[#007AFF] opacity-0 group-hover:opacity-100 transition-opacity font-medium">
          Open →
        </div>
      </div>
    </div>
  );
}
