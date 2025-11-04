/**
 * Google Docs API client for fetching document content
 * For publicly shared documents, uses export URL format
 */

const GOOGLE_DOCS_API_KEY = process.env.GOOGLE_DOCS_API_KEY || 'AIzaSyBlGnntqz3XIUB-Ysbj7COt9EhPxnAvmXY';

interface GoogleDocsMetadata {
  name?: string;
  mimeType?: string;
  description?: string;
}

interface GoogleDocsResult {
  success: boolean;
  content?: string;
  title?: string;
  metadata?: GoogleDocsMetadata;
  error?: string;
}

/**
 * Extract document ID from Google Docs URL
 * Supports formats:
 * - https://docs.google.com/document/d/{ID}/edit
 * - https://docs.google.com/document/d/{ID}
 */
export function extractDocumentId(url: string): string | null {
  try {
    const patterns = [
      /\/document\/d\/([a-zA-Z0-9_-]+)/,
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
 * Check if URL is a Google Docs URL
 */
export function isGoogleDocsUrl(url: string): boolean {
  return url.includes('docs.google.com/document');
}

/**
 * Fetch document metadata using Drive API v3
 * This uses the API key to verify file accessibility
 */
async function fetchDocumentMetadata(documentId: string): Promise<GoogleDocsMetadata | null> {
  try {
    const metadataUrl = `https://www.googleapis.com/drive/v3/files/${documentId}?fields=name,mimeType,description&key=${GOOGLE_DOCS_API_KEY}`;

    console.log('[Google Docs] Fetching metadata for document:', documentId);

    const response = await fetch(metadataUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[Google Docs] Metadata fetch failed:', response.status);
      return null;
    }

    const metadata = await response.json();
    console.log('[Google Docs] Metadata fetched:', metadata.name);

    return {
      name: metadata.name,
      mimeType: metadata.mimeType,
      description: metadata.description,
    };
  } catch (error) {
    console.error('[Google Docs] Error fetching metadata:', error);
    return null;
  }
}

/**
 * Fetch Google Docs content using export URL
 * This works for publicly shared documents without authentication
 */
export async function fetchGoogleDocsContent(url: string): Promise<GoogleDocsResult> {
  const documentId = extractDocumentId(url);

  if (!documentId) {
    return {
      success: false,
      error: 'Invalid Google Docs URL. Could not extract document ID.',
    };
  }

  try {
    // Try to fetch metadata first using the API key
    const metadata = await fetchDocumentMetadata(documentId);

    // Fetch document content using export URL (works for public docs)
    // We'll try text format first, then fall back to HTML
    const exportFormats = [
      { format: 'txt', mimeType: 'text/plain' },
      { format: 'html', mimeType: 'text/html' },
    ];

    let content: string | null = null;
    let usedFormat: string | null = null;

    for (const { format, mimeType } of exportFormats) {
      try {
        const exportUrl = `https://docs.google.com/document/d/${documentId}/export?format=${format}`;

        console.log(`[Google Docs] Attempting to fetch content in ${format} format`);

        const response = await fetch(exportUrl, {
          method: 'GET',
          headers: {
            'Accept': mimeType,
          },
        });

        if (response.ok) {
          content = await response.text();
          usedFormat = format;
          console.log(`[Google Docs] Successfully fetched content in ${format} format, length:`, content.length);
          break;
        } else {
          console.error(`[Google Docs] Export failed for ${format}:`, response.status);
        }
      } catch (error) {
        console.error(`[Google Docs] Error fetching ${format}:`, error);
        continue;
      }
    }

    if (!content) {
      return {
        success: false,
        error: 'Failed to fetch document content. The document may not be publicly shared or accessible.',
      };
    }

    // Clean HTML content if we got HTML format
    if (usedFormat === 'html') {
      content = stripHtmlTags(content);
    }

    return {
      success: true,
      content: content.trim(),
      title: metadata?.name || 'Google Doc',
      metadata,
    };
  } catch (error) {
    console.error('[Google Docs] Error fetching document:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch Google Docs content',
    };
  }
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
  text = text.replace(/\n\s*\n\s*\n/g, '\n\n'); // Remove excessive newlines
  text = text.replace(/[ \t]+/g, ' '); // Normalize spaces
  text = text.trim();

  return text;
}
