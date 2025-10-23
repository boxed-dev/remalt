'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Editor, Range } from '@tiptap/core';
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Type,
  CheckSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  command: (editor: Editor, range: Range) => void;
}

export const slashCommandItems: SlashCommandItem[] = [
  {
    title: 'Text',
    description: 'Start writing with plain text',
    icon: <Type className="h-4 w-4" />,
    command: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setParagraph()
        .run();
    },
  },
  {
    title: 'Heading 1',
    description: 'Large section heading',
    icon: <Heading1 className="h-4 w-4" />,
    command: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setHeading({ level: 1 })
        .run();
    },
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: <Heading2 className="h-4 w-4" />,
    command: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setHeading({ level: 2 })
        .run();
    },
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    icon: <Heading3 className="h-4 w-4" />,
    command: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setHeading({ level: 3 })
        .run();
    },
  },
  {
    title: 'Bullet List',
    description: 'Create a simple bullet list',
    icon: <List className="h-4 w-4" />,
    command: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleBulletList()
        .run();
    },
  },
  {
    title: 'Numbered List',
    description: 'Create a numbered list',
    icon: <ListOrdered className="h-4 w-4" />,
    command: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleOrderedList()
        .run();
    },
  },
  {
    title: 'To-do List',
    description: 'Track tasks with checkboxes',
    icon: <CheckSquare className="h-4 w-4" />,
    command: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleTaskList()
        .run();
    },
  },
  {
    title: 'Quote',
    description: 'Add a blockquote',
    icon: <Quote className="h-4 w-4" />,
    command: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleBlockquote()
        .run();
    },
  },
  {
    title: 'Code Block',
    description: 'Add a code snippet',
    icon: <Code className="h-4 w-4" />,
    command: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleCodeBlock()
        .run();
    },
  },
  {
    title: 'Divider',
    description: 'Add a horizontal divider',
    icon: <Minus className="h-4 w-4" />,
    command: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setHorizontalRule()
        .run();
    },
  },
];

interface SlashCommandMenuProps {
  editor: Editor;
  range: Range;
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

export const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({
  items,
  command,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
        return true;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % items.length);
        return true;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const item = items[selectedIndex];
        if (item) {
          command(item);
        }
        return true;
      }

      return false;
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, items, command]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="z-50 w-80 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl"
    >
      <div className="p-1 max-h-96 overflow-y-auto">
        {items.map((item, index) => (
          <button
            key={index}
            onClick={() => command(item)}
            className={cn(
              "flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-all duration-150",
              "hover:bg-gray-100",
              selectedIndex === index && "bg-gray-100"
            )}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white">
              <div className="text-gray-700">
                {item.icon}
              </div>
            </div>
            <div className="flex-1 space-y-0.5">
              <div className="font-medium text-gray-900">{item.title}</div>
              <div className="text-xs text-gray-500">
                {item.description}
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className="border-t border-gray-200 bg-gray-50 px-3 py-2">
        <div className="text-xs text-gray-500">
          Use arrow keys to navigate • Enter to select
        </div>
      </div>
    </div>
  );
};