'use client';

import {
  useCreateBlockNote,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import "@blocknote/core/fonts/inter.css";
import type { Block } from "@blocknote/core";
import { useEffect, useState, useRef } from "react";
import { X, FileText } from "lucide-react";
import { useNotesStore } from "@/lib/stores/notes-store";

interface NotesPanelProps {
  workflowId: string;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function NotesPanel({
  workflowId,
  userId,
  isOpen,
  onClose,
}: NotesPanelProps) {
  const { content, isSaving, isLoading, loadNotes, saveNotes, updateContent } =
    useNotesStore();
  const [initialBlocks, setInitialBlocks] = useState<Block[] | undefined>(
    undefined
  );
  const [isEditorReady, setIsEditorReady] = useState(false);
  const isInitializingRef = useRef(false);
  const lastSavedContent = useRef<string>('');

  // Get content for this workflow
  const workflowContent = content[workflowId] || '';
  const isWorkflowSaving = isSaving[workflowId] || false;
  const isWorkflowLoading = isLoading[workflowId] || false;

  // Initialize editor with StarterKit and extensions
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: 'Start typing your notes or type "/" for commands...',
        emptyEditorClass: 'is-editor-empty',
      }),
      Typography,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
          class: 'text-primary underline hover:no-underline cursor-pointer',
        },
      }),
      TextStyle,
      Color,
      Underline,
      TaskList.configure({
        HTMLAttributes: {
          class: 'not-prose pl-0',
        },
      }),
      TaskItem.configure({
        HTMLAttributes: {
          class: 'flex items-start',
        },
        nested: true,
      }),
      SlashCommandExtension,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[200px] px-4 py-3',
      },
    },
    onUpdate: ({ editor }) => {
      if (!isInitializingRef.current) {
        const json = editor.getJSON();
        const jsonString = JSON.stringify(json);

        // Only update if content actually changed
        if (jsonString !== lastSavedContent.current) {
          updateContent(workflowId, jsonString);
          debouncedSave();
        }
      }
    },
  });

  // Debounced save function (1 second)
  const debouncedSave = useDebouncedCallback(
    async () => {
      if (workflowId !== 'new' && editor && !isInitializingRef.current) {
        const json = editor.getJSON();
        const jsonString = JSON.stringify(json);
        lastSavedContent.current = jsonString;
        await saveNotes(workflowId, userId, jsonString);
      }
    },
    1000
  );

  // Load notes when panel opens or workflow changes
  useEffect(() => {
    if (isOpen && workflowId && userId) {
      console.log("[NotesPanel] Loading notes for workflow:", workflowId);
      loadNotes(workflowId, userId);
    }
  }, [isOpen, workflowId, userId, loadNotes]);

  // Update editor content when data changes
  useEffect(() => {
    if (!editor || !isOpen || isEditorReady) return;

    isInitializingRef.current = true;
    const storedContent = content[workflowId] || "";
    console.log("[NotesPanel] Parsing content for:", workflowId);

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
      console.error("[NotesPanel] Failed to parse JSON, using default:", error);
      // Let editor use default content on error
      setIsEditorReady(true);
      setTimeout(() => {
        isInitializingRef.current = false;
      }, 100);
    }
  }, [editor, workflowContent]);

  // Cleanup on unmount
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
        console.log("[NotesPanel] Auto-saving notes");
        saveNotes(workflowId, userId, blocksString);
      }, 1000);
    });

    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

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
            {currentSaving ? "Saving..." : "Saved"}
          </div>

          {/* Toolbar */}
          {editor && isEditorReady && (
            <TiptapToolbar editor={editor} />
          )}

          {/* Editor */}
          <div className="flex-1 overflow-y-auto">
            {isWorkflowLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <EditorContent
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
                      return !["image", "video", "audio", "file"].includes(
                        title
                      );
                    });
                    // Filter by query
                    if (!query) return filteredItems;
                    const lowerQuery = query.toLowerCase();
                    return filteredItems.filter(
                      (item) =>
                        item.title.toLowerCase().includes(lowerQuery) ||
                        item.subtext?.toLowerCase().includes(lowerQuery) ||
                        item.aliases?.some((alias) =>
                          alias.toLowerCase().includes(lowerQuery)
                        )
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
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
              sans-serif;
          }

          .bn-editor {
            padding: 0;
          }

          /* HIDE: Plus button (add block button) and drag handle buttons */
          .bn-side-menu,
          .bn-side-menu button[data-test="addBlock"],
          .bn-side-menu .bn-add-block-button,
          .bn-drag-handle-menu,
          .bn-drag-handle-button,
          button[data-test="dragHandle"],
          button[aria-label*="Add block"],
          button[title*="Add block"],
          button[aria-label*="Drag"],
          button[title*="Drag"] {
            display: none !important;
          }

          /* Heading styles */
          .bn-block-content h1 {
            font-size: 1.875rem;
            font-weight: 700;
            line-height: 1.3;
            color: #111827;
            margin: 1rem 0 0.5rem;
          }

          .bn-block-content h2 {
            font-size: 1.5rem;
            font-weight: 600;
            line-height: 1.3;
            color: #1f2937;
            margin: 0.875rem 0 0.5rem;
          }

          .bn-block-content h3 {
            font-size: 1.25rem;
            font-weight: 600;
            line-height: 1.3;
            color: #374151;
            margin: 0.75rem 0 0.375rem;
          }

          /* Paragraph styles - Reduced spacing */
          .bn-block-content p {
            font-size: 0.9375rem;
            line-height: 1.4;
            color: #4b5563;
            margin-bottom: 0.25rem;
          }

          /* List styles - Reduced spacing */
          .bn-block-content ul,
          .bn-block-content ol {
            margin-left: 1.5rem;
            margin-bottom: 0.25rem;
          }

          .bn-block-content li {
            font-size: 0.9375rem;
            line-height: 1.4;
            color: #4b5563;
            margin-bottom: 0.125rem;
          }

          /* Toggle list styling - Fix vertical alignment */
          .bn-toggle-wrapper {
            display: flex !important;
            align-items: center !important;
            gap: 0.375rem !important;
          }

          .bn-toggle-button {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            flex-shrink: 0 !important;
          }

          .bn-toggle-wrapper .bn-inline-content {
            line-height: 1.4 !important;
            margin: 0 !important;
          }

          .bn-block-content [data-content-type="toggleList"] {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .bn-block-content [data-content-type="toggleList"] button,
          .bn-block-content [data-content-type="toggleList"] .bn-toggle-icon,
          .bn-block-content details summary {
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .bn-block-content details summary {
            line-height: 1.4;
          }

          .bn-block-content details summary::marker,
          .bn-block-content details summary::-webkit-details-marker {
            vertical-align: middle;
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