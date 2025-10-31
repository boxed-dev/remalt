import { Badge } from "@/components/ui/badge";
import { Flow } from "@/lib/mock-data/flows";
import { Trash2, Globe } from "lucide-react";
import { useState } from "react";

// Extended Flow type to support both mock and real data
interface ExtendedFlow extends Omit<Flow, 'created' | 'updated' | 'recentlyOpened'> {
  nodeCount?: number;
  lastEdited?: Date;
  isPublic?: boolean;
  category?: string;
}

interface FlowCardProps {
  flow: ExtendedFlow;
  onClick?: () => void;
  onDelete?: () => void;
  onPublish?: () => void;
  isTemplateAdmin?: boolean;
}

export function FlowCard({ flow, onClick, onDelete, onPublish, isTemplateAdmin }: FlowCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handlePublish = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPublish) {
      onPublish();
    }
  };

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
      className="group relative border border-[#E8ECEF] rounded-xl p-6 hover:border-[#095D40] hover:shadow-[0_4px_16px_rgba(9,93,64,0.12)] hover:-translate-y-1 transition-all duration-200 cursor-pointer bg-white"
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
          <h4 className="text-[15px] font-semibold text-[#1A1D21] mb-2">Delete Canvas?</h4>
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

      {/* Published Badge - Top Right (Hides on Hover) */}
      {flow.isPublic && (
        <div className="absolute top-3 right-3 z-[5] opacity-100 group-hover:opacity-0 transition-opacity duration-200">
          <Badge className="bg-[#095D40] text-white hover:bg-[#074830] text-[10px] font-medium flex items-center gap-1">
            <Globe className="h-3 w-3" />
            Public
          </Badge>
        </div>
      )}

      {/* Action Buttons (Show on Hover) */}
      <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-[10]">
        {/* Publish Button (Admin Only) */}
        {isTemplateAdmin && onPublish && (
          <button
            onClick={handlePublish}
            className="p-2 rounded-lg hover:bg-[#095D40]/10 bg-white shadow-sm transition-all duration-200"
            title={flow.isPublic ? "Manage template" : "Publish as template"}
          >
            <Globe className={`h-4 w-4 ${flow.isPublic ? 'text-[#095D40]' : 'text-[#6B7280]'}`} />
          </button>
        )}

        {/* Delete Button */}
        {onDelete && (
          <button
            onClick={handleDelete}
            className="p-2 rounded-lg hover:bg-[#FF3B30]/10 bg-white shadow-sm transition-all duration-200"
            title="Delete workflow"
          >
            <Trash2 className="h-4 w-4 text-[#FF3B30]" />
          </button>
        )}
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 pr-8">
          <h3 className="font-semibold text-[16px] mb-1 text-[#1A1D21] truncate group-hover:text-[#095D40] transition-colors">
            {flow.name}
          </h3>
          {flow.description && (
            <p className="text-[13px] text-[#6B7280] line-clamp-2">
              {flow.description}
            </p>
          )}
        </div>
      </div>

      {/* Tags */}
      {flow.tags && flow.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
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
    </div>
  );
}
