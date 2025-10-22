"use client";

import { useWorkflowStore } from "@/lib/stores/workflow-store";
import { cn } from "@/lib/utils";
import { Cloud, CloudOff, AlertCircle } from "lucide-react";
import { useMemo, useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Format relative time in a human-readable way (Figma/Linear style)
function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;

  // For older timestamps, show date
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SaveStatusIndicator() {
  const isSaving = useWorkflowStore((state) => state.isSaving);
  const saveError = useWorkflowStore((state) => state.saveError);
  const lastSaved = useWorkflowStore((state) => state.lastSaved);

  // Force re-render every 5 seconds to update relative time
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!lastSaved) return;

    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [lastSaved]);

  const status = useMemo(() => {
    if (isSaving) return "saving";
    if (saveError) return "error";
    if (lastSaved) return "saved";
    return "idle";
  }, [isSaving, saveError, lastSaved]);

  const { Icon, text, textClassName, iconClassName, tooltip, showPulse } =
    useMemo(() => {
      switch (status) {
        case "saving":
          return {
            Icon: Cloud,
            text: "Saving...",
            textClassName: "text-[#6B7280]",
            iconClassName: "",
            tooltip: "Your workflow is being saved to the cloud",
            showPulse: true,
          };
        case "error":
          return {
            Icon: CloudOff,
            text: "Not saved",
            textClassName: "text-[#EF4444]",
            iconClassName: "",
            tooltip:
              saveError || "Failed to save. Your changes are stored locally.",
            showPulse: false,
          };
        case "saved":
          const relativeTime = lastSaved ? formatRelativeTime(lastSaved) : "";
          const fullTime = lastSaved
            ? new Date(lastSaved).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })
            : "";

          return {
            Icon: Cloud,
            text: `Synced ${relativeTime}`,
            textClassName: "text-[#9CA3AF]",
            iconClassName: "",
            tooltip: `Last synced: ${fullTime}`,
            showPulse: false,
          };
        default:
          return {
            Icon: null,
            text: "",
            textClassName: "",
            iconClassName: "",
            tooltip: "",
            showPulse: false,
          };
      }
    }, [status, saveError, lastSaved]);

  if (status === "idle" || !Icon) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md transition-all duration-200",
              "hover:bg-[#F5F5F7]",
              status === "error" && "bg-[#FEF2F2]"
            )}
          >
            <div className="relative">
              <Icon
                className={cn(
                  "h-3.5 w-3.5 transition-all duration-200",
                  textClassName,
                  iconClassName
                )}
              />
              {showPulse && (
                <>
                  {/* Outer pulse ring */}
                  <span className="absolute inset-0 h-3.5 w-3.5 animate-ping opacity-20">
                    <Icon className="h-3.5 w-3.5 text-[#007AFF]" />
                  </span>
                  {/* Inner pulse */}
                  <span className="absolute inset-0 h-3.5 w-3.5 animate-pulse opacity-40">
                    <Icon className="h-3.5 w-3.5 text-[#007AFF]" />
                  </span>
                </>
              )}
            </div>
            <span
              className={cn(
                "text-[11px] font-medium transition-colors duration-200",
                textClassName
              )}
              style={{
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                letterSpacing: "-0.01em",
              }}
            >
              {text}
            </span>
            {status === "error" && (
              <AlertCircle className="h-3 w-3 text-[#EF4444] ml-0.5" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="text-xs px-3 py-1.5"
          style={{
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
          }}
        >
          <p>{tooltip}</p>
          {status === "error" && saveError && (
            <p className="text-[10px] text-[#9CA3AF] mt-1 max-w-xs">
              {saveError}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
