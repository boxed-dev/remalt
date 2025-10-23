import type { JSONContent } from '@tiptap/core';

/**
 * Converts BlockNote blocks to TipTap JSON format
 * BlockNote uses an array of blocks, TipTap uses a document with nodes
 */
export function blockNoteToTipTap(blockNoteContent: any): JSONContent {
  // If already in TipTap format (has 'type' and 'content' at root)
  if (blockNoteContent?.type === 'doc') {
    return blockNoteContent;
  }

  // Handle empty or invalid content
  if (!blockNoteContent || !Array.isArray(blockNoteContent)) {
    return {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: []
        }
      ]
    };
  }

  // Convert BlockNote blocks to TipTap nodes
  const nodes = blockNoteContent.map((block: any) => convertBlock(block));

  return {
    type: 'doc',
    content: nodes.length > 0 ? nodes : [{ type: 'paragraph', content: [] }]
  };
}

function convertBlock(block: any): JSONContent {
  if (!block || typeof block !== 'object') {
    return { type: 'paragraph', content: [] };
  }

  const { type, content, props } = block;

  switch (type) {
    case 'paragraph':
      return {
        type: 'paragraph',
        content: convertInlineContent(content)
      };

    case 'heading':
      return {
        type: 'heading',
        attrs: { level: props?.level || 1 },
        content: convertInlineContent(content)
      };

    case 'bulletListItem':
      return {
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: convertInlineContent(content)
          }
        ]
      };

    case 'numberedListItem':
      return {
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: convertInlineContent(content)
          }
        ]
      };

    case 'code':
      return {
        type: 'codeBlock',
        attrs: { language: props?.language || null },
        content: convertInlineContent(content)
      };

    case 'quote':
      return {
        type: 'blockquote',
        content: [
          {
            type: 'paragraph',
            content: convertInlineContent(content)
          }
        ]
      };

    default:
      // Fallback for unknown block types
      return {
        type: 'paragraph',
        content: convertInlineContent(content)
      };
  }
}

function convertInlineContent(content: any): JSONContent[] {
  if (!content) return [];

  // If it's already an array of inline nodes
  if (Array.isArray(content)) {
    return content.map(item => convertInlineNode(item)).filter(Boolean);
  }

  // If it's a string
  if (typeof content === 'string') {
    return [{ type: 'text', text: content }];
  }

  // If it's a single inline node
  if (typeof content === 'object') {
    const converted = convertInlineNode(content);
    return converted ? [converted] : [];
  }

  return [];
}

function convertInlineNode(node: any): JSONContent | null {
  if (!node || typeof node !== 'object') {
    if (typeof node === 'string') {
      return { type: 'text', text: node };
    }
    return null;
  }

  const { type, text, styles, href, content } = node;

  // Handle text nodes
  if (type === 'text' || text !== undefined) {
    const textNode: any = {
      type: 'text',
      text: text || ''
    };

    // Apply marks (styles)
    if (styles && typeof styles === 'object') {
      const marks: any[] = [];

      if (styles.bold) marks.push({ type: 'bold' });
      if (styles.italic) marks.push({ type: 'italic' });
      if (styles.underline) marks.push({ type: 'underline' });
      if (styles.strike) marks.push({ type: 'strike' });
      if (styles.code) marks.push({ type: 'code' });

      if (marks.length > 0) {
        textNode.marks = marks;
      }
    }

    return textNode;
  }

  // Handle link nodes
  if (type === 'link') {
    return {
      type: 'text',
      text: content?.[0]?.text || text || '',
      marks: [
        {
          type: 'link',
          attrs: {
            href: href || '#',
            target: '_blank'
          }
        }
      ]
    };
  }

  // Fallback for unknown inline types
  if (text) {
    return { type: 'text', text };
  }

  return null;
}

/**
 * Checks if content is in BlockNote format
 */
export function isBlockNoteFormat(content: any): boolean {
  if (!content) return false;

  // TipTap format has type: 'doc' at root
  if (content?.type === 'doc') return false;

  // BlockNote format is an array of blocks
  if (!Array.isArray(content)) return false;

  // Check if first item looks like a BlockNote block
  const firstBlock = content[0];
  if (!firstBlock) return false;

  // BlockNote blocks have type, content, and sometimes props
  return (
    typeof firstBlock === 'object' &&
    'type' in firstBlock &&
    ('content' in firstBlock || 'props' in firstBlock)
  );
}

/**
 * Safely parse JSON content and convert if needed
 */
export function parseAndConvertContent(contentString: string): JSONContent {
  if (!contentString || contentString.trim() === '') {
    return {
      type: 'doc',
      content: [{ type: 'paragraph', content: [] }]
    };
  }

  try {
    const parsed = JSON.parse(contentString);

    // Check if it's BlockNote format and convert
    if (isBlockNoteFormat(parsed)) {
      return blockNoteToTipTap(parsed);
    }

    // Already TipTap format or return as is
    return parsed;
  } catch (error) {
    console.error('Error parsing content:', error);
    // Return empty doc on parse error
    return {
      type: 'doc',
      content: [{ type: 'paragraph', content: [] }]
    };
  }
}