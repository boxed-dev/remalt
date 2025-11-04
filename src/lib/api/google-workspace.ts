/**
 * Google Workspace API client for fetching Docs, Slides, and Sheets content
 * For publicly shared documents, uses export URL format
 */

const GOOGLE_API_KEY = process.env.GOOGLE_DOCS_API_KEY || 'AIzaSyBlGnntqz3XIUB-Ysbj7COt9EhPxnAvmXY';

export type WorkspaceDocumentType = 'document' | 'presentation' | 'spreadsheet';

interface WorkspaceMetadata {
  name?: string;
  mimeType?: string;
  description?: string;
}

export interface WorkspaceResult {
  success: boolean;
  content?: string;
  title?: string;
  metadata?: WorkspaceMetadata;
  error?: string;
  documentType?: WorkspaceDocumentType;
  sheetCount?: number; // For spreadsheets
}

/**
 * Detect document type from URL
 */
export function detectDocumentType(url: string): WorkspaceDocumentType | null {
  if (url.includes('docs.google.com/document')) return 'document';
  if (url.includes('docs.google.com/presentation')) return 'presentation';
  if (url.includes('docs.google.com/spreadsheets')) return 'spreadsheet';
  return null;
}

/**
 * Check if URL is any Google Workspace document
 */
export function isGoogleWorkspaceUrl(url: string): boolean {
  return detectDocumentType(url) !== null;
}

/**
 * Legacy function for backward compatibility
 */
export function isGoogleDocsUrl(url: string): boolean {
  return url.includes('docs.google.com/document');
}

/**
 * Extract document ID from Google Workspace URL
 * Supports formats:
 * - https://docs.google.com/document/d/{ID}/edit
 * - https://docs.google.com/presentation/d/{ID}/edit
 * - https://docs.google.com/spreadsheets/d/{ID}/edit
 */
export function extractDocumentId(url: string): string | null {
  try {
    const patterns = [
      /\/(?:document|presentation|spreadsheets)\/d\/([a-zA-Z0-9_-]+)/,
      /\/d\/([a-zA-Z0-9_-]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match?.[1]) {
        return match[1];
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch document metadata using Drive API v3
 */
async function fetchDocumentMetadata(documentId: string): Promise<WorkspaceMetadata | null> {
  try {
    const metadataUrl = `https://www.googleapis.com/drive/v3/files/${documentId}?fields=name,mimeType,description&key=${GOOGLE_API_KEY}`;

    console.log('[Google Workspace] Fetching metadata for document:', documentId);

    const response = await fetch(metadataUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[Google Workspace] Metadata fetch failed:', response.status);
      return null;
    }

    const metadata = await response.json();
    console.log('[Google Workspace] Metadata fetched:', metadata.name);

    return {
      name: metadata.name,
      mimeType: metadata.mimeType,
      description: metadata.description,
    };
  } catch (error) {
    console.error('[Google Workspace] Error fetching metadata:', error);
    return null;
  }
}

/**
 * Fetch Google Docs content (text document)
 */
async function fetchDocumentContent(documentId: string): Promise<{ content: string; format: string } | null> {
  const exportFormats = [
    { format: 'txt', mimeType: 'text/plain' },
    { format: 'html', mimeType: 'text/html' },
  ];

  for (const { format, mimeType } of exportFormats) {
    try {
      const exportUrl = `https://docs.google.com/document/d/${documentId}/export?format=${format}`;

      console.log(`[Google Workspace] Fetching document in ${format} format`);

      const response = await fetch(exportUrl, {
        method: 'GET',
        headers: { 'Accept': mimeType },
      });

      if (response.ok) {
        const content = await response.text();
        console.log(`[Google Workspace] Document fetched (${format}), length:`, content.length);
        return { content, format };
      }
    } catch (error) {
      console.error(`[Google Workspace] Error fetching document ${format}:`, error);
      continue;
    }
  }

  return null;
}

/**
 * Fetch Google Slides content (presentation)
 */
async function fetchPresentationContent(documentId: string): Promise<{ content: string; format: string } | null> {
  const exportFormats = [
    { format: 'txt', mimeType: 'text/plain' },
    { format: 'pdf', mimeType: 'application/pdf' }, // Fallback, but won't parse
  ];

  for (const { format, mimeType } of exportFormats) {
    try {
      const exportUrl = `https://docs.google.com/presentation/d/${documentId}/export?format=${format}`;

      console.log(`[Google Workspace] Fetching presentation in ${format} format`);

      const response = await fetch(exportUrl, {
        method: 'GET',
        headers: { 'Accept': mimeType },
      });

      if (response.ok) {
        const content = await response.text();
        console.log(`[Google Workspace] Presentation fetched (${format}), length:`, content.length);
        return { content, format };
      }
    } catch (error) {
      console.error(`[Google Workspace] Error fetching presentation ${format}:`, error);
      continue;
    }
  }

  return null;
}

/**
 * Fetch Google Sheets content (spreadsheet)
 * Returns CSV format with data from first sheet
 */
async function fetchSpreadsheetContent(documentId: string): Promise<{ content: string; format: string; sheetCount?: number } | null> {
  try {
    // Export first sheet as CSV (gid=0 is the first sheet)
    const exportUrl = `https://docs.google.com/spreadsheets/d/${documentId}/export?format=csv&gid=0`;

    console.log('[Google Workspace] Fetching spreadsheet as CSV');

    const response = await fetch(exportUrl, {
      method: 'GET',
      headers: { 'Accept': 'text/csv' },
    });

    if (response.ok) {
      const content = await response.text();
      console.log('[Google Workspace] Spreadsheet fetched (csv), length:', content.length);

      // Count rows for basic statistics
      const rows = content.split('\n').filter(row => row.trim());
      console.log('[Google Workspace] Spreadsheet rows:', rows.length);

      return { content, format: 'csv', sheetCount: 1 };
    } else {
      console.error('[Google Workspace] Spreadsheet export failed:', response.status);
    }
  } catch (error) {
    console.error('[Google Workspace] Error fetching spreadsheet:', error);
  }

  return null;
}

/**
 * Strip HTML tags and extract plain text
 */
function stripHtmlTags(html: string): string {
  // Remove script and style tags and their content
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Replace common block elements with newlines
  text = text.replace(/<\/?(p|div|br|h[1-6]|li|tr)[^>]*>/gi, '\n');

  // Remove remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");

  // Clean up whitespace
  text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
  text = text.replace(/[ \t]+/g, ' ');
  text = text.trim();

  return text;
}

/**
 * Format CSV content for preview
 * Converts CSV to readable text format
 */
function formatCsvForPreview(csv: string): string {
  const rows = csv.split('\n').filter(row => row.trim());
  const maxRows = 20; // Show first 20 rows

  const previewRows = rows.slice(0, maxRows);

  // Simple formatting: just clean up the CSV
  let formatted = previewRows.join('\n');

  if (rows.length > maxRows) {
    formatted += `\n\n... and ${rows.length - maxRows} more rows`;
  }

  return formatted;
}

/**
 * Main function to fetch Google Workspace content
 * Supports Docs, Slides, and Sheets
 */
export async function fetchGoogleWorkspaceContent(url: string): Promise<WorkspaceResult> {
  const documentType = detectDocumentType(url);

  if (!documentType) {
    return {
      success: false,
      error: 'Invalid Google Workspace URL. Must be a Docs, Slides, or Sheets link.',
    };
  }

  const documentId = extractDocumentId(url);

  if (!documentId) {
    return {
      success: false,
      error: 'Could not extract document ID from URL.',
    };
  }

  try {
    // Fetch metadata for all types
    const metadata = await fetchDocumentMetadata(documentId);

    // Fetch content based on type
    let result: { content: string; format: string; sheetCount?: number } | null = null;

    switch (documentType) {
      case 'document':
        result = await fetchDocumentContent(documentId);
        break;
      case 'presentation':
        result = await fetchPresentationContent(documentId);
        break;
      case 'spreadsheet':
        result = await fetchSpreadsheetContent(documentId);
        break;
    }

    if (!result) {
      return {
        success: false,
        error: 'Failed to fetch document content. The document may not be publicly shared or accessible.',
        documentType,
      };
    }

    // Process content based on format
    let content = result.content;

    if (result.format === 'html') {
      content = stripHtmlTags(content);
    } else if (result.format === 'csv') {
      content = formatCsvForPreview(content);
    }

    // Get appropriate title based on type
    let defaultTitle = 'Google Doc';
    if (documentType === 'presentation') defaultTitle = 'Google Slides';
    if (documentType === 'spreadsheet') defaultTitle = 'Google Sheets';

    return {
      success: true,
      content: content.trim(),
      title: metadata?.name || defaultTitle,
      metadata,
      documentType,
      sheetCount: result.sheetCount,
    };
  } catch (error) {
    console.error('[Google Workspace] Error fetching document:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch content',
      documentType,
    };
  }
}

/**
 * Legacy function for backward compatibility
 * Redirects to fetchGoogleWorkspaceContent
 */
export async function fetchGoogleDocsContent(url: string): Promise<WorkspaceResult> {
  return fetchGoogleWorkspaceContent(url);
}
