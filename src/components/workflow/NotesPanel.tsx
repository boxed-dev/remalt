"use client";

import { useCreateBlockNote, SuggestionMenuController, getDefaultReactSlashMenuItems } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import "@blocknote/core/fonts/inter.css";
import type { Block } from '@blocknote/core';
import { useEffect, useState, useRef } from 'react';
import { X, FileText } from 'lucide-react';
import { useNotesStore } from '@/lib/stores/notes-store';

interface NotesPanelProps {
  workflowId: string;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function NotesPanel({ workflowId, userId, isOpen, onClose }: NotesPanelProps) {
  const { content, isSaving, isLoading, loadNotes, saveNotes, updateContent } = useNotesStore();
  const [initialBlocks, setInitialBlocks] = useState<Block[] | undefined>(undefined);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializingRef = useRef(false);

  // Create BlockNote editor
  const editor = useCreateBlockNote({
    initialContent: initialBlocks,
  });

  // Load notes when panel opens or workflowId changes
  useEffect(() => {
    if (isOpen && workflowId && userId) {
      console.log('[NotesPanel] Loading notes for workflow:', workflowId);
      loadNotes(workflowId, userId);
    }
  }, [isOpen, workflowId, userId, loadNotes]);

  // Parse content from store and update editor (only on initial load)
  useEffect(() => {
    if (!editor || !isOpen || isEditorReady) return;

    isInitializingRef.current = true;
    const storedContent = content[workflowId] || '';
    console.log('[NotesPanel] Parsing content for:', workflowId);

    if (!storedContent) {
      // Empty state - let editor use default content
      setIsEditorReady(true);
      // Small delay to ensure editor is stable before allowing onChange
      setTimeout(() => {
        isInitializingRef.current = false;
      }, 100);
      return;
    }

    try {
      // Try to parse as BlockNote blocks array
      const parsed: Block[] = JSON.parse(storedContent);
      // Only replace blocks once during initialization
      editor.replaceBlocks(editor.document, parsed);
      setIsEditorReady(true);
      // Small delay to ensure editor is stable before allowing onChange
      setTimeout(() => {
        isInitializingRef.current = false;
      }, 100);
    } catch (error) {
      console.error('[NotesPanel] Failed to parse JSON, using default:', error);
      // Let editor use default content on error
      setIsEditorReady(true);
      setTimeout(() => {
        isInitializingRef.current = false;
      }, 100);
    }
  }, [content, workflowId, editor, isOpen, isEditorReady]);

  // Setup onChange listener for editor (only after editor is ready)
  useEffect(() => {
    if (!editor || !isEditorReady) return;

    // Listen to editor changes
    const unsubscribe = editor.onChange(() => {
      // Skip onChange during initialization to prevent infinite loops
      if (isInitializingRef.current) {
        return;
      }

      // Get blocks from editor
      const blocks = editor.document;
      const blocksString = JSON.stringify(blocks);
      
      // Update local store immediately
      updateContent(workflowId, blocksString);

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounce save to Supabase (1 second)
      saveTimeoutRef.current = setTimeout(() => {
        console.log('[NotesPanel] Auto-saving notes');
        saveNotes(workflowId, userId, blocksString);
      }, 1000);
    });

    return () => {
      // Cleanup timeout on unmount
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Unsubscribe from editor changes
      unsubscribe();
    };
  }, [editor, workflowId, userId, isEditorReady, updateContent, saveNotes]);

  const currentLoading = isLoading[workflowId] || false;
  const currentSaving = isSaving[workflowId] || false;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div className="fixed right-0 top-0 h-full w-[480px] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-700" />
            <h2 className="text-[15px] font-semibold text-gray-900">
              Workflow Notes
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close notes panel"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Save Status */}
        <div className="px-6 py-2 border-b border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500">
            {currentSaving ? 'Saving...' : 'Saved'}
          </div>
        </div>

        {/* Editor Content */}
        <div className="flex-1 overflow-y-auto bg-white">
          {currentLoading || !isEditorReady ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-sm text-gray-500">Loading notes...</div>
            </div>
          ) : (
            <div className="px-4 py-4">
              <BlockNoteView
                editor={editor}
                theme="light"
                data-theming-css-variables-demo
              >
                <SuggestionMenuController
                  triggerCharacter={"/"}
                  getItems={async (query) => {
                    const items = getDefaultReactSlashMenuItems(editor);
                    const filteredItems = items.filter((item) => {
                      const title = item.title.toLowerCase();
                      return !["image", "video", "audio", "file"].includes(title);
                    });
                    // Filter by query
                    if (!query) return filteredItems;
                    const lowerQuery = query.toLowerCase();
                    return filteredItems.filter((item) => 
                      item.title.toLowerCase().includes(lowerQuery) ||
                      item.subtext?.toLowerCase().includes(lowerQuery) ||
                      item.aliases?.some(alias => alias.toLowerCase().includes(lowerQuery))
                    );
                  }}
                />
              </BlockNoteView>
            </div>
          )}
        </div>

        {/* Custom Styles for BlockNote Editor */}
        <style jsx global>{`
          /* BlockNote custom styling */
          .bn-container {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }

          .bn-editor {
            padding: 0;
          }

          /* HIDE: Plus button (add block button) by hiding the add-block-button */
          .bn-side-menu button[data-test="addBlock"],
          .bn-side-menu .bn-add-block-button,
          button[aria-label*="Add block"],
          button[title*="Add block"] {
            display: none !important;
          }

          /* SHOW: Drag handles with proper centering */
          .bn-drag-handle-menu {
            position: absolute !important;
            left: -28px !important;
            top: 0 !important;
            height: 100% !important;
            display: flex !important;
            align-items: center !important;
            opacity: 0;
            transition: opacity 0.2s;
          }

          .bn-block-outer:hover .bn-drag-handle-menu {
            opacity: 1;
          }

          /* Drag handle button styling */
          .bn-drag-handle-button,
          button[data-test="dragHandle"],
          button[aria-label*="Drag"],
          button[title*="Drag"] {
            cursor: grab !important;
            padding: 4px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }

          .bn-drag-handle-button:active {
            cursor: grabbing !important;
          }

          /* Heading styles */
          .bn-block-content h1 {
            font-size: 1.875rem;
            font-weight: 700;
            line-height: 2.25rem;
            color: #111827;
            margin: 1.5rem 0 1rem;
          }

          .bn-block-content h2 {
            font-size: 1.5rem;
            font-weight: 600;
            line-height: 2rem;
            color: #1f2937;
            margin: 1.25rem 0 0.75rem;
          }

          .bn-block-content h3 {
            font-size: 1.25rem;
            font-weight: 600;
            line-height: 1.75rem;
            color: #374151;
            margin: 1rem 0 0.5rem;
          }

          /* Paragraph styles */
          .bn-block-content p {
            font-size: 0.9375rem;
            line-height: 1.625rem;
            color: #4b5563;
            margin-bottom: 0.75rem;
          }

          /* List styles */
          .bn-block-content ul,
          .bn-block-content ol {
            margin-left: 1.5rem;
            margin-bottom: 0.75rem;
          }

          .bn-block-content li {
            font-size: 0.9375rem;
            line-height: 1.625rem;
            color: #4b5563;
            margin-bottom: 0.25rem;
          }

          /* Slash menu styling */
          .bn-suggestion-menu {
            background: white;
            border-radius: 0.5rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            border: 1px solid #e5e7eb;
            max-height: 400px;
            overflow-y: auto;
          }

          .bn-suggestion-menu-item {
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
          }

          .bn-suggestion-menu-item[data-selected="true"] {
            background: #f3f4f6;
          }

          /* Formatting toolbar */
          .bn-formatting-toolbar {
            background: white;
            border-radius: 0.5rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            border: 1px solid #e5e7eb;
          }

          /* Remove first element top margin */
          .bn-editor > .bn-block-outer:first-child h1,
          .bn-editor > .bn-block-outer:first-child h2,
          .bn-editor > .bn-block-outer:first-child h3,
          .bn-editor > .bn-block-outer:first-child p {
            margin-top: 0;
          }
        `}</style>
      </div>
    </>
  );
}
