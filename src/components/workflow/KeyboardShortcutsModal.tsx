"use client"

import { useEffect, useMemo } from "react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"

interface ShortcutItem {
  label: string
  keys: string
  searchTerms?: string
}

// Detect if user is on Mac
const isMac = typeof window !== 'undefined' ? navigator.platform.toUpperCase().indexOf('MAC') >= 0 : false

const generalShortcuts: ShortcutItem[] = [
  { label: "Boards Menu", keys: "Cmd/Ctrl+K", searchTerms: "command k menu boards" },
  { label: "Undo change", keys: "Cmd/Ctrl+Z", searchTerms: "undo" },
  { label: "Redo change", keys: "Cmd/Ctrl+Shift+Z", searchTerms: "redo" },
  { label: "Zoom In Board", keys: "=", searchTerms: "zoom in plus" },
  { label: "Zoom Out Board", keys: "-", searchTerms: "zoom out minus" },
  { label: "Fit View", keys: "1", searchTerms: "fit view reset" },
]

const addBlockShortcuts: ShortcutItem[] = [
  { label: "AI Chat", keys: "C", searchTerms: "chat assistant ai" },
  { label: "Social media", keys: "S", searchTerms: "social media instagram linkedin youtube" },
  { label: "Audio recording", keys: "R or V", searchTerms: "audio recording voice" },
  { label: "Image", keys: "I", searchTerms: "image photo picture" },
  { label: "Text note", keys: "T", searchTerms: "text note" },
  { label: "Annotation", keys: "A", searchTerms: "annotation connector" },
  { label: "Website", keys: "W", searchTerms: "website webpage url" },
  { label: "Mindmap", keys: "M", searchTerms: "mindmap mind map" },
  { label: "Document", keys: "D", searchTerms: "document pdf file" },
  { label: "Group", keys: "G", searchTerms: "group nodes" },
]

const advancedShortcuts: ShortcutItem[] = [
  { label: "Save workflow", keys: "Cmd/Ctrl+S", searchTerms: "save" },
  { label: "Copy nodes", keys: "Cmd/Ctrl+C", searchTerms: "copy" },
  { label: "Paste nodes", keys: "Cmd/Ctrl+V", searchTerms: "paste" },
  { label: "Duplicate node", keys: "Cmd/Ctrl+D", searchTerms: "duplicate" },
  { label: "Clear selection", keys: "Esc", searchTerms: "clear escape deselect" },
  { label: "Ungroup nodes", keys: "Cmd/Ctrl+Shift+G", searchTerms: "ungroup" },
  { label: "Quick add menu", keys: "/", searchTerms: "quick add menu" },
  { label: "Pan canvas (hold)", keys: "Space", searchTerms: "pan move canvas space" },
  { label: "Pointer mode", keys: "V", searchTerms: "pointer select" },
  { label: "Hand mode", keys: "H", searchTerms: "hand pan" },
]

interface KeyboardShortcutsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function KeyboardShortcutsModal({ open, onOpenChange }: KeyboardShortcutsModalProps) {
  // Replace Cmd/Ctrl with platform-specific key
  const formatKeys = (keys: string) => {
    return keys.replace(/Cmd\/Ctrl/g, isMac ? 'Cmd' : 'Ctrl')
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Close with Escape
      if (e.key === "Escape" && open) {
        e.preventDefault()
        onOpenChange(false)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => onOpenChange(false)}
      />

      {/* Command Dialog */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-3xl px-4 animate-in slide-in-from-bottom-4 duration-300">
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="border-b border-gray-100 bg-gradient-to-b from-gray-50/50 to-white px-5 py-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Keyboard Shortcuts</h2>
              <button
                onClick={() => onOpenChange(false)}
                className="h-7 w-7 rounded-md hover:bg-gray-100 flex items-center justify-center transition-colors group cursor-pointer"
              >
                <span className="text-gray-400 group-hover:text-gray-600 text-xl leading-none">×</span>
              </button>
            </div>
          </div>

          {/* Command Component */}
          <Command className="border-0 shadow-none">
            <CommandInput placeholder="Type a command or search..." className="border-0" />
            <CommandList className="max-h-[400px] pb-2">
              <CommandEmpty>No results found.</CommandEmpty>

              <CommandGroup heading="General">
                {generalShortcuts.map((shortcut, index) => (
                  <CommandItem key={index} keywords={[shortcut.searchTerms || shortcut.label]}>
                    <span className="flex-1">{shortcut.label}</span>
                    <CommandShortcut className="flex items-center gap-1">
                      {formatKeys(shortcut.keys).split('+').map((key, i, arr) => (
                        <span key={i} className="flex items-center gap-1">
                          <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-gray-200 bg-gray-50 px-1.5 font-mono text-[10px] font-medium text-gray-700 shadow-sm">
                            {key}
                          </kbd>
                          {i < arr.length - 1 && <span className="text-gray-400 text-[10px]">+</span>}
                        </span>
                      ))}
                    </CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Add Block">
                {addBlockShortcuts.map((shortcut, index) => (
                  <CommandItem key={index} keywords={[shortcut.searchTerms || shortcut.label]}>
                    <span className="flex-1">{shortcut.label}</span>
                    <CommandShortcut>
                      <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-gray-200 bg-gray-50 px-1.5 font-mono text-[10px] font-medium text-gray-700 shadow-sm">
                        {shortcut.keys}
                      </kbd>
                    </CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Advanced">
                {advancedShortcuts.map((shortcut, index) => (
                  <CommandItem key={index} keywords={[shortcut.searchTerms || shortcut.label]}>
                    <span className="flex-1">{shortcut.label}</span>
                    <CommandShortcut className="flex items-center gap-1">
                      {formatKeys(shortcut.keys).split('+').map((key, i, arr) => (
                        <span key={i} className="flex items-center gap-1">
                          <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-gray-200 bg-gray-50 px-1.5 font-mono text-[10px] font-medium text-gray-700 shadow-sm">
                            {key}
                          </kbd>
                          {i < arr.length - 1 && <span className="text-gray-400 text-[10px]">+</span>}
                        </span>
                      ))}
                    </CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>

          {/* Footer */}
          <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-2.5">
            <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500">
              <span>Press</span>
              <kbd className="inline-flex h-5 min-w-[24px] items-center justify-center rounded border border-gray-200 bg-white px-1.5 font-mono text-[10px] font-medium text-gray-600 shadow-sm">
                Esc
              </kbd>
              <span>to close the menu</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
