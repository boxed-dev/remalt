"use client"

import { useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface KeyboardShortcutsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ShortcutItem {
  label: string
  keys: string[]
}

const generalShortcuts: ShortcutItem[] = [
  { label: "Boards Menu", keys: ["Cmd/Ctrl", "K"] },
  { label: "Undo change", keys: ["Cmd/Ctrl", "Z"] },
  { label: "Redo change", keys: ["Cmd/Ctrl", "Shift", "Z"] },
  { label: "Zoom In Board", keys: ["="] },
  { label: "Zoom Out Board", keys: ["-"] },
  { label: "Fit View", keys: ["1"] },
]

const addBlockShortcuts: ShortcutItem[] = [
  { label: "AI Chat", keys: ["C"] },
  { label: "Social media", keys: ["S"] },
  { label: "Audio recording", keys: ["R"] },
  { label: "Image", keys: ["I"] },
  { label: "Text", keys: ["T"] },
  { label: "Annotation", keys: ["A"] },
  { label: "Website", keys: ["W"] },
  { label: "Mindmap", keys: ["M"] },
  { label: "Document", keys: ["D"] },
]

function ShortcutRow({ label, keys }: ShortcutItem) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, index) => (
          <div key={index} className="flex items-center gap-1">
            <kbd className="pointer-events-none inline-flex h-6 min-w-[24px] select-none items-center justify-center rounded border bg-muted px-2 font-mono text-xs font-medium text-muted-foreground">
              {key}
            </kbd>
            {index < keys.length - 1 && (
              <span className="text-muted-foreground/50 text-xs">+</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function KeyboardShortcutsModal({
  open,
  onOpenChange,
}: KeyboardShortcutsModalProps) {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
      if (e.key === "Escape" && open) {
        e.preventDefault()
        onOpenChange(false)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [open, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[850px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-8 mt-4">
          <div>
            <h3 className="text-sm font-semibold mb-3">General</h3>
            <div className="space-y-0">
              {generalShortcuts.map((shortcut, index) => (
                <ShortcutRow key={index} {...shortcut} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Add Block</h3>
            <div className="space-y-0">
              {addBlockShortcuts.map((shortcut, index) => (
                <ShortcutRow key={index} {...shortcut} />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t text-center text-sm text-muted-foreground">
          Press{" "}
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground mx-1">
            Esc
          </kbd>{" "}
          to close the menu
        </div>
      </DialogContent>
    </Dialog>
  )
}
