#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Check if content is in BlockNote format
 */
function isBlockNoteFormat(content) {
  if (!content) return false;

  // TipTap format has type: 'doc' at root
  if (content?.type === 'doc') return false;

  // BlockNote format is an array of blocks
  if (!Array.isArray(content)) return false;

  // Check if first item looks like a BlockNote block
  const firstBlock = content[0];
  if (!firstBlock) return false;

  return (
    typeof firstBlock === 'object' &&
    'type' in firstBlock &&
    ('content' in firstBlock || 'props' in firstBlock)
  );
}

/**
 * Convert BlockNote blocks to TipTap format
 */
function blockNoteToTipTap(blockNoteContent) {
  if (!blockNoteContent || !Array.isArray(blockNoteContent)) {
    return {
      type: 'doc',
      content: [{ type: 'paragraph', content: [] }]
    };
  }

  const nodes = blockNoteContent.map(block => convertBlock(block));

  return {
    type: 'doc',
    content: nodes.length > 0 ? nodes : [{ type: 'paragraph', content: [] }]
  };
}

function convertBlock(block) {
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
        content: [{
          type: 'paragraph',
          content: convertInlineContent(content)
        }]
      };

    case 'numberedListItem':
      return {
        type: 'listItem',
        content: [{
          type: 'paragraph',
          content: convertInlineContent(content)
        }]
      };

    case 'code':
      return {
        type: 'codeBlock',
        attrs: { language: props?.language || null },
        content: convertInlineContent(content)
      };

    default:
      return {
        type: 'paragraph',
        content: convertInlineContent(content)
      };
  }
}

function convertInlineContent(content) {
  if (!content) return [];

  if (Array.isArray(content)) {
    return content.map(item => convertInlineNode(item)).filter(Boolean);
  }

  if (typeof content === 'string') {
    return [{ type: 'text', text: content }];
  }

  if (typeof content === 'object') {
    const converted = convertInlineNode(content);
    return converted ? [converted] : [];
  }

  return [];
}

function convertInlineNode(node) {
  if (!node || typeof node !== 'object') {
    if (typeof node === 'string') {
      return { type: 'text', text: node };
    }
    return null;
  }

  const { type, text, styles } = node;

  if (type === 'text' || text !== undefined) {
    const textNode = {
      type: 'text',
      text: text || ''
    };

    if (styles && typeof styles === 'object') {
      const marks = [];

      if (styles.bold) marks.push({ type: 'bold' });
      if (styles.italic) marks.push({ type: 'italic' });
      if (styles.underline) marks.push({ type: 'underline' });
      if (styles.code) marks.push({ type: 'code' });

      if (marks.length > 0) {
        textNode.marks = marks;
      }
    }

    return textNode;
  }

  return null;
}

async function migrateNotes() {
  console.log('Starting notes migration from BlockNote to TipTap...');

  try {
    // Fetch all notes
    const { data: notes, error } = await supabase
      .from('workflow_notes')
      .select('id, content');

    if (error) {
      console.error('Error fetching notes:', error);
      return;
    }

    if (!notes || notes.length === 0) {
      console.log('No notes found to migrate');
      return;
    }

    console.log(`Found ${notes.length} notes to check`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const note of notes) {
      try {
        // Skip empty content
        if (!note.content || note.content.trim() === '') {
          skippedCount++;
          continue;
        }

        // Parse JSON content
        let parsed;
        try {
          parsed = JSON.parse(note.content);
        } catch (e) {
          console.error(`Error parsing note ${note.id}:`, e.message);
          errorCount++;
          continue;
        }

        // Check if it's BlockNote format
        if (!isBlockNoteFormat(parsed)) {
          console.log(`Note ${note.id} is already in TipTap format or unknown format`);
          skippedCount++;
          continue;
        }

        // Convert to TipTap format
        console.log(`Converting note ${note.id} from BlockNote to TipTap...`);
        const tiptapContent = blockNoteToTipTap(parsed);

        // Update in database
        const { error: updateError } = await supabase
          .from('workflow_notes')
          .update({ content: JSON.stringify(tiptapContent) })
          .eq('id', note.id);

        if (updateError) {
          console.error(`Error updating note ${note.id}:`, updateError);
          errorCount++;
        } else {
          console.log(`Successfully migrated note ${note.id}`);
          migratedCount++;
        }

      } catch (err) {
        console.error(`Unexpected error processing note ${note.id}:`, err);
        errorCount++;
      }
    }

    console.log('\nMigration complete:');
    console.log(`- Migrated: ${migratedCount} notes`);
    console.log(`- Skipped: ${skippedCount} notes (already migrated or empty)`);
    console.log(`- Errors: ${errorCount} notes`);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateNotes().then(() => {
  console.log('\nMigration script finished');
  process.exit(0);
}).catch(err => {
  console.error('Migration script error:', err);
  process.exit(1);
});