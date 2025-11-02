/**
 * NovelEditor - Notion-style rich text editor with markdown shortcuts
 *
 * SLASH COMMANDS (Type '/' to trigger):
 * - /text - Plain text paragraph
 * - /h1, /h2, /h3 - Headings
 * - /bullet - Bullet list
 * - /numbered - Numbered list
 * - /todo - To-do list with checkboxes
 * - /quote - Blockquote
 * - /code - Code block
 * - /divider - Horizontal rule
 * - /callout - Highlighted callout box
 *
 * MARKDOWN SHORTCUTS (Auto-converts as you type):
 * - # + space → Heading 1
 * - ## + space → Heading 2
 * - ### + space → Heading 3
 * - - + space → Bullet list
 * - 1. + space → Numbered list
 * - [] + space → To-do list
 * - > + space → Blockquote
 * - ``` + space → Code block
 * - --- + Enter → Horizontal divider
 * - **text** → Bold
 * - *text* → Italic
 * - `code` → Inline code
 * - ~~text~~ → Strikethrough
 *
 * KEYBOARD SHORTCUTS:
 * - Cmd/Ctrl + B → Bold
 * - Cmd/Ctrl + I → Italic
 * - Cmd/Ctrl + K → Add link
 * - Cmd/Ctrl + Z → Undo
 * - Cmd/Ctrl + Shift + Z → Redo
 */

'use client';

import { EditorRoot, EditorContent, EditorCommand, EditorCommandItem, EditorCommandEmpty } from 'novel';
import { StarterKit, TiptapLink, TiptapImage, TaskList, TaskItem, TextStyle, Color } from 'novel';
import type { JSONContent } from 'novel';
import { useEffect, useState } from 'react';
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Quote,
  MinusIcon,
  Text,
  Image,
  Table,
  Link,
  AlertCircle,
  Lightbulb,
  FileText,
  Calendar,
  Hash,
  AtSign
} from 'lucide-react';

interface NovelEditorProps {
  content: string;
  onChange: (content: string, plainText: string) => void;
  placeholder?: string;
  editable?: boolean;
}

const suggestionItems = [
  {
    title: 'Text',
    description: 'Just start writing plain text',
    searchTerms: ['p', 'paragraph'],
    icon: <Text className="w-4 h-4" />,
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode('paragraph')
        .run();
    },
  },
  {
    title: 'Heading 1',
    description: 'Big section heading',
    searchTerms: ['h1', 'heading', 'title'],
    icon: <Heading1 className="w-4 h-4" />,
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode('heading', { level: 1 })
        .run();
    },
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    searchTerms: ['h2', 'heading', 'subtitle'],
    icon: <Heading2 className="w-4 h-4" />,
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode('heading', { level: 2 })
        .run();
    },
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    searchTerms: ['h3', 'heading', 'subheading'],
    icon: <Heading3 className="w-4 h-4" />,
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode('heading', { level: 3 })
        .run();
    },
  },
  {
    title: 'Bullet List',
    description: 'Create a simple bullet list',
    searchTerms: ['ul', 'unordered', 'list'],
    icon: <List className="w-4 h-4" />,
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: 'Numbered List',
    description: 'Create a numbered list',
    searchTerms: ['ol', 'ordered', 'list'],
    icon: <ListOrdered className="w-4 h-4" />,
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: 'To-do List',
    description: 'Track tasks with a checklist',
    searchTerms: ['todo', 'task', 'checkbox', 'check'],
    icon: <CheckSquare className="w-4 h-4" />,
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: 'Quote',
    description: 'Capture a quote',
    searchTerms: ['blockquote', 'citation'],
    icon: <Quote className="w-4 h-4" />,
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: 'Code',
    description: 'Capture a code snippet',
    searchTerms: ['codeblock', 'pre'],
    icon: <Code className="w-4 h-4" />,
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: 'Divider',
    description: 'Visually divide blocks',
    searchTerms: ['hr', 'horizontal', 'rule', 'separator'],
    icon: <MinusIcon className="w-4 h-4" />,
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: 'Callout',
    description: 'Highlight important information',
    searchTerms: ['alert', 'info', 'warning', 'note'],
    icon: <AlertCircle className="w-4 h-4" />,
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: 'paragraph',
          attrs: { class: 'callout' },
          content: [{ type: 'text', text: '💡 ' }],
        })
        .run();
    },
  },
];

export function NovelEditor({
  content,
  onChange,
  placeholder = "Start typing or press '/' for commands...",
  editable = true,
}: NovelEditorProps) {
  const [initialContent, setInitialContent] = useState<JSONContent | undefined>(undefined);

  useEffect(() => {
    try {
      const parsed = JSON.parse(content);
      setInitialContent(parsed);
    } catch {
      setInitialContent({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [],
          },
        ],
      });
    }
  }, []);

  if (!initialContent) {
    return null;
  }

  return (
    <EditorRoot>
      <div className="relative">
        <EditorContent
        immediatelyRender={false}
        initialContent={initialContent}
        extensions={[
          StarterKit.configure({
            heading: {
              levels: [1, 2, 3],
              HTMLAttributes: {
                class: 'font-bold leading-tight',
              },
            },
            paragraph: {
              HTMLAttributes: {
                class: 'text-[13px] leading-relaxed mb-3 last:mb-0',
              },
            },
            codeBlock: {
              HTMLAttributes: {
                class: 'rounded-lg bg-[#1e1e1e] text-gray-300 p-4 font-mono text-[12px] overflow-x-auto border border-gray-700 my-3',
              },
            },
            bulletList: {
              HTMLAttributes: {
                class: 'list-disc ml-5 my-3 space-y-1 text-[13px]',
              },
            },
            orderedList: {
              HTMLAttributes: {
                class: 'list-decimal ml-5 my-3 space-y-1 text-[13px]',
              },
            },
            listItem: {
              HTMLAttributes: {
                class: 'leading-relaxed text-[13px]',
              },
            },
            blockquote: {
              HTMLAttributes: {
                class: 'border-l-4 border-[#E5E7EB] pl-4 italic text-[#6B7280] my-4',
              },
            },
            horizontalRule: {
              HTMLAttributes: {
                class: 'my-6 border-t-2 border-[#E5E7EB]',
              },
            },
            code: {
              HTMLAttributes: {
                class: 'px-1.5 py-0.5 rounded-md bg-[#F3F4F6] text-[#374151] text-[11px] font-mono',
              },
            },
          }),
          TiptapLink.configure({
            HTMLAttributes: {
              class: 'text-[#095D40] underline underline-offset-2 hover:text-[#074030] cursor-pointer text-[13px]',
            },
            openOnClick: false,
          }),
          TiptapImage.configure({
            allowBase64: true,
            HTMLAttributes: {
              class: 'rounded-lg max-w-full h-auto my-4',
            },
          }),
          TaskList.configure({
            HTMLAttributes: {
              class: 'not-prose pl-2',
            },
          }),
          TaskItem.configure({
            HTMLAttributes: {
              class: 'flex items-start my-2',
            },
            nested: true,
          }),
          TextStyle,
          Color,
        ]}
        editable={editable}
        onUpdate={({ editor }) => {
          const json = JSON.stringify(editor.getJSON());
          const text = editor.getText();
          onChange(json, text);
        }}
        editorProps={{
          attributes: {
            class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] px-4 py-3 text-[13px]',
            style: 'line-height: 1.6;',
          },
        }}
        slotAfter={<div className="px-4 pb-3" />}
      >
        <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border border-[#E5E7EB] bg-white px-1 py-2 shadow-md transition-all">
          <EditorCommandEmpty className="px-2 text-[#9CA3AF] text-xs">
            No results
          </EditorCommandEmpty>
          {suggestionItems.map((item) => (
            <EditorCommandItem
              key={item.title}
              onCommand={(val) => item.command(val)}
              className="flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm hover:bg-[#F3F4F6] cursor-pointer aria-selected:bg-[#F3F4F6]"
              value={item.title}
              keywords={item.searchTerms}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E7EB] bg-white">
                {item.icon}
              </div>
              <div>
                <p className="font-medium text-[13px]">{item.title}</p>
                <p className="text-[11px] text-[#6B7280]">{item.description}</p>
              </div>
            </EditorCommandItem>
          ))}
        </EditorCommand>
        </EditorContent>
      </div>
    </EditorRoot>
  );
}
