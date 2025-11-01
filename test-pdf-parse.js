/**
 * Test script for PDF parsing edge function
 *
 * Usage: node test-pdf-parse.js
 */

const SUPABASE_URL = 'https://enohvkozrazgjpbmnkgr.supabase.co';

// Test with a sample PDF URL
const testPdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

async function testEdgeFunction() {
  console.log('🧪 Testing PDF Parse Edge Function...\n');

  try {
    // You'll need to provide a valid auth token
    // Get this from your browser's dev tools after logging in
    const authToken = process.env.SUPABASE_AUTH_TOKEN || 'YOUR_AUTH_TOKEN_HERE';

    if (authToken === 'YOUR_AUTH_TOKEN_HERE') {
      console.log('❌ Please set SUPABASE_AUTH_TOKEN environment variable');
      console.log('   Get your auth token from browser dev tools:');
      console.log('   1. Login to your app');
      console.log('   2. Open dev tools → Application → Local Storage');
      console.log('   3. Find supabase.auth.token → access_token');
      console.log('\nOr run: SUPABASE_AUTH_TOKEN=your_token node test-pdf-parse.js\n');
      process.exit(1);
    }

    const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/parse-pdf`;

    console.log('📍 Edge Function URL:', edgeFunctionUrl);
    console.log('📄 Test PDF URL:', testPdfUrl);
    console.log('\n⏳ Calling edge function...\n');

    const startTime = Date.now();

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        pdfUrl: testPdfUrl,
        forceReparse: true, // Skip cache for testing
      }),
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      console.error('❌ Edge function returned error:', response.status);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      process.exit(1);
    }

    const result = await response.json();

    console.log('✅ Success!\n');
    console.log('📊 Results:');
    console.log('  • Status:', result.status);
    console.log('  • Parse Method:', result.parseMethod);
    console.log('  • Cached:', result.cached);
    console.log('  • Page Count:', result.pageCount);
    console.log('  • Segments:', result.segments?.length || 0);
    console.log('  • Text Length:', result.parsedText?.length || 0, 'chars');
    console.log('  • Parse Duration:', result.parseDurationMs, 'ms');
    console.log('  • Total Duration:', duration, 'ms');
    console.log('\n📝 First 200 chars of parsed text:');
    console.log('  ', result.parsedText?.substring(0, 200) || 'No text');

    if (result.segments && result.segments.length > 0) {
      console.log('\n📑 Segments:');
      result.segments.slice(0, 3).forEach((seg, idx) => {
        console.log(`  ${idx + 1}. ${seg.heading || 'Untitled'} (Page ${seg.page || '?'})`);
        console.log(`     ${seg.content?.substring(0, 100) || ''}...`);
      });
    }

    console.log('\n✨ Edge function is working correctly!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Alternative: Test through Next.js API route
async function testViaNextAPI() {
  console.log('🧪 Testing via Next.js API Route...\n');

  try {
    const apiUrl = 'http://localhost:3000/api/pdf/parse';

    console.log('📍 API URL:', apiUrl);
    console.log('📄 Test PDF URL:', testPdfUrl);
    console.log('\n⏳ Calling API...\n');

    const startTime = Date.now();

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add your auth cookie here if needed
      },
      body: JSON.stringify({
        pdfUrl: testPdfUrl,
        forceReparse: true,
      }),
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      console.error('❌ API returned error:', response.status);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      process.exit(1);
    }

    const result = await response.json();

    console.log('✅ Success!\n');
    console.log('📊 Results:');
    console.log('  • Status:', result.status);
    console.log('  • Parse Method:', result.metadata?.parseMethod);
    console.log('  • Cached:', result.metadata?.cached);
    console.log('  • Page Count:', result.pageCount);
    console.log('  • Segments:', result.segments?.length || 0);
    console.log('  • Text Length:', result.parsedText?.length || 0, 'chars');
    console.log('  • Parse Duration:', result.metadata?.parseDurationMs, 'ms');
    console.log('  • Total Duration:', duration, 'ms');
    console.log('  • Via Edge Function:', result.metadata?.edgeFunction);

    console.log('\n✨ Next.js API is working correctly!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Check command line args
const args = process.argv.slice(2);
if (args.includes('--api')) {
  testViaNextAPI();
} else {
  testEdgeFunction();
}
