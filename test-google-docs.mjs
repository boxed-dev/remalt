/**
 * Test script for Google Docs integration
 * Usage: node test-google-docs.mjs <google-docs-url>
 */

const GOOGLE_DOCS_API_KEY = 'AIzaSyBlGnntqz3XIUB-Ysbj7COt9EhPxnAvmXY';

/**
 * Extract document ID from Google Docs URL
 */
function extractDocumentId(url) {
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
}

/**
 * Check if URL is a Google Docs URL
 */
function isGoogleDocsUrl(url) {
  return url.includes('docs.google.com/document');
}

/**
 * Fetch document metadata using Drive API v3
 */
async function fetchDocumentMetadata(documentId) {
  try {
    const metadataUrl = `https://www.googleapis.com/drive/v3/files/${documentId}?fields=name,mimeType,description&key=${GOOGLE_DOCS_API_KEY}`;

    console.log('\n[Metadata] Fetching metadata for document:', documentId);

    const response = await fetch(metadataUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[Metadata] Fetch failed:', response.status, response.statusText);
      return null;
    }

    const metadata = await response.json();
    console.log('[Metadata] Success:', metadata.name);
    console.log('[Metadata] MIME Type:', metadata.mimeType);
    if (metadata.description) {
      console.log('[Metadata] Description:', metadata.description);
    }

    return metadata;
  } catch (error) {
    console.error('[Metadata] Error:', error.message);
    return null;
  }
}

/**
 * Fetch Google Docs content using export URL
 */
async function testGoogleDocsExport(url) {
  console.log('\n=== Testing Google Docs Integration ===\n');
  console.log('Input URL:', url);

  if (!isGoogleDocsUrl(url)) {
    console.error('❌ Not a valid Google Docs URL');
    return;
  }

  const documentId = extractDocumentId(url);
  if (!documentId) {
    console.error('❌ Could not extract document ID from URL');
    return;
  }

  console.log('✅ Document ID:', documentId);

  // Fetch metadata
  const metadata = await fetchDocumentMetadata(documentId);

  // Test text export
  console.log('\n[Export] Attempting to fetch content in text format...');
  const txtExportUrl = `https://docs.google.com/document/d/${documentId}/export?format=txt`;

  try {
    const txtResponse = await fetch(txtExportUrl);

    if (txtResponse.ok) {
      const content = await txtResponse.text();
      console.log('✅ Text export successful!');
      console.log('Content length:', content.length, 'characters');
      console.log('\n--- Content Preview (first 500 chars) ---');
      console.log(content.substring(0, 500));
      console.log('--- End Preview ---\n');

      if (metadata) {
        console.log('\n=== Summary ===');
        console.log('Document Name:', metadata.name);
        console.log('Content Length:', content.length, 'characters');
        console.log('Export Status: ✅ Success');
      }
    } else {
      console.error('❌ Text export failed:', txtResponse.status, txtResponse.statusText);
      console.log('\nThis usually means:');
      console.log('  1. The document is not publicly shared');
      console.log('  2. You need to set sharing to "Anyone with the link"');
      console.log('  3. The document ID is incorrect');
    }
  } catch (error) {
    console.error('❌ Export error:', error.message);
  }
}

// Run test
const testUrl = process.argv[2];

if (!testUrl) {
  console.error('Usage: node test-google-docs.mjs <google-docs-url>');
  console.error('\nExample:');
  console.error('  node test-google-docs.mjs "https://docs.google.com/document/d/YOUR_DOC_ID/edit"');
  process.exit(1);
}

testGoogleDocsExport(testUrl);
