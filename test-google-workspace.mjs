/**
 * Test script for Google Workspace integration (Docs, Slides, Sheets)
 * Usage: node test-google-workspace.mjs <google-url>
 *
 * Examples:
 *   node test-google-workspace.mjs "https://docs.google.com/document/d/YOUR_ID/edit"
 *   node test-google-workspace.mjs "https://docs.google.com/presentation/d/YOUR_ID/edit"
 *   node test-google-workspace.mjs "https://docs.google.com/spreadsheets/d/YOUR_ID/edit"
 */

const GOOGLE_API_KEY = 'AIzaSyBlGnntqz3XIUB-Ysbj7COt9EhPxnAvmXY';

/**
 * Detect document type from URL
 */
function detectDocumentType(url) {
  if (url.includes('docs.google.com/document')) return 'document';
  if (url.includes('docs.google.com/presentation')) return 'presentation';
  if (url.includes('docs.google.com/spreadsheets')) return 'spreadsheet';
  return null;
}

/**
 * Extract document ID from Google Workspace URL
 */
function extractDocumentId(url) {
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
}

/**
 * Fetch document metadata using Drive API v3
 */
async function fetchDocumentMetadata(documentId) {
  try {
    const metadataUrl = `https://www.googleapis.com/drive/v3/files/${documentId}?fields=name,mimeType,description&key=${GOOGLE_API_KEY}`;

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

    return metadata;
  } catch (error) {
    console.error('[Metadata] Error:', error.message);
    return null;
  }
}

/**
 * Test Google Workspace document export
 */
async function testGoogleWorkspaceExport(url) {
  console.log('\n=== Testing Google Workspace Integration ===\n');
  console.log('Input URL:', url);

  const docType = detectDocumentType(url);

  if (!docType) {
    console.error('❌ Not a valid Google Workspace URL');
    return;
  }

  const typeName = docType === 'document' ? 'Google Docs' : docType === 'presentation' ? 'Google Slides' : 'Google Sheets';
  console.log('✅ Detected:', typeName);

  const documentId = extractDocumentId(url);
  if (!documentId) {
    console.error('❌ Could not extract document ID from URL');
    return;
  }

  console.log('✅ Document ID:', documentId);

  // Fetch metadata
  const metadata = await fetchDocumentMetadata(documentId);

  // Test export based on type
  let exportUrl, format, mimeType;

  switch (docType) {
    case 'document':
      exportUrl = `https://docs.google.com/document/d/${documentId}/export?format=txt`;
      format = 'txt';
      mimeType = 'text/plain';
      break;
    case 'presentation':
      exportUrl = `https://docs.google.com/presentation/d/${documentId}/export?format=txt`;
      format = 'txt';
      mimeType = 'text/plain';
      break;
    case 'spreadsheet':
      exportUrl = `https://docs.google.com/spreadsheets/d/${documentId}/export?format=csv&gid=0`;
      format = 'csv';
      mimeType = 'text/csv';
      break;
  }

  console.log(`\n[Export] Attempting to fetch content in ${format} format...`);

  try {
    const response = await fetch(exportUrl, {
      headers: { 'Accept': mimeType },
    });

    if (response.ok) {
      const content = await response.text();
      console.log('✅ Export successful!');
      console.log('Content length:', content.length, 'characters');

      // Calculate statistics
      if (docType === 'spreadsheet') {
        const rows = content.split('\n').filter(row => row.trim());
        console.log('Row count:', rows.length);
        console.log('\n--- CSV Preview (first 10 rows) ---');
        console.log(rows.slice(0, 10).join('\n'));
        console.log('--- End Preview ---\n');
      } else {
        const wordCount = content.split(/\s+/).filter(Boolean).length;
        console.log('Word count:', wordCount);

        if (docType === 'presentation') {
          const estimatedSlides = Math.max(1, Math.ceil(wordCount / 100));
          console.log('Estimated slides:', estimatedSlides);
        }

        console.log('\n--- Content Preview (first 500 chars) ---');
        console.log(content.substring(0, 500));
        console.log('--- End Preview ---\n');
      }

      if (metadata) {
        console.log('\n=== Summary ===');
        console.log('Document Type:', typeName);
        console.log('Document Name:', metadata.name);
        console.log('Content Length:', content.length, 'characters');
        console.log('Export Status: ✅ Success');
      }
    } else {
      console.error('❌ Export failed:', response.status, response.statusText);
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
  console.error('Usage: node test-google-workspace.mjs <google-workspace-url>');
  console.error('\nExamples:');
  console.error('  node test-google-workspace.mjs "https://docs.google.com/document/d/YOUR_ID/edit"');
  console.error('  node test-google-workspace.mjs "https://docs.google.com/presentation/d/YOUR_ID/edit"');
  console.error('  node test-google-workspace.mjs "https://docs.google.com/spreadsheets/d/YOUR_ID/edit"');
  process.exit(1);
}

testGoogleWorkspaceExport(testUrl);
