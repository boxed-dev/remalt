/**
 * Test script for the Instagram Dual Transcribe API
 *
 * This script demonstrates how to use the /api/instagram/dual-transcribe endpoint
 * to get transcriptions from both Google Gemini and Deepgram for an Instagram video.
 *
 * Usage:
 *   node test-dual-transcribe.js <instagram-url>
 *
 * Example:
 *   node test-dual-transcribe.js https://www.instagram.com/reel/ABC123/
 */

const API_URL = 'http://localhost:3000/api/instagram/dual-transcribe';

async function testDualTranscribe(instagramUrl) {
  console.log('🎬 Testing Instagram Dual Transcribe API');
  console.log('━'.repeat(60));
  console.log(`📎 Instagram URL: ${instagramUrl}`);
  console.log('━'.repeat(60));
  console.log();

  const startTime = Date.now();

  try {
    console.log('⏳ Sending request to API...\n');

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: instagramUrl,
      }),
    });

    const data = await response.json();
    const requestTime = Date.now() - startTime;

    if (!response.ok) {
      console.error('❌ API Error:', data.error);
      console.error('Details:', data.details || 'No details provided');
      process.exit(1);
    }

    if (!data.success) {
      console.error('❌ Request failed:', data.error);
      process.exit(1);
    }

    console.log('✅ SUCCESS! Dual transcription completed\n');
    console.log('━'.repeat(60));
    console.log('📊 INSTAGRAM POST INFO');
    console.log('━'.repeat(60));
    console.log(`Post Code:   ${data.instagram.postCode}`);
    console.log(`Author:      @${data.instagram.author}`);
    console.log(`Video URL:   ${data.instagram.videoUrl.substring(0, 60)}...`);
    if (data.instagram.caption) {
      const shortCaption = data.instagram.caption.substring(0, 100);
      console.log(`Caption:     ${shortCaption}${data.instagram.caption.length > 100 ? '...' : ''}`);
    }
    console.log();

    console.log('━'.repeat(60));
    console.log('🤖 GOOGLE GEMINI TRANSCRIPTION');
    console.log('━'.repeat(60));
    console.log(`Model:       ${data.gemini.model}`);
    console.log(`Time:        ${data.gemini.processingTime}ms`);
    console.log(`Length:      ${data.comparison.geminiLength} characters`);
    console.log(`Word Count:  ${data.comparison.geminiWordCount} words`);
    console.log();
    console.log('📝 Transcript:');
    console.log(wrapText(data.gemini.transcript, 76));
    console.log();
    console.log('📋 Summary:');
    console.log(wrapText(data.gemini.summary, 76));
    console.log();

    console.log('━'.repeat(60));
    console.log('🎙️  DEEPGRAM TRANSCRIPTION');
    console.log('━'.repeat(60));
    console.log(`Model:       ${data.deepgram.model}`);
    console.log(`Time:        ${data.deepgram.processingTime}ms`);
    console.log(`Confidence:  ${(data.deepgram.confidence * 100).toFixed(1)}%`);
    console.log(`Length:      ${data.comparison.deepgramLength} characters`);
    console.log(`Word Count:  ${data.comparison.deepgramWordCount} words`);
    console.log(`Words Data:  ${data.deepgram.words.length} timestamped words`);
    console.log();
    console.log('📝 Transcript:');
    console.log(wrapText(data.deepgram.transcript, 76));
    console.log();

    console.log('━'.repeat(60));
    console.log('🔍 COMPARISON');
    console.log('━'.repeat(60));
    console.log(`Word Count Difference: ${Math.abs(data.comparison.geminiWordCount - data.comparison.deepgramWordCount)} words`);
    console.log(`Length Difference:     ${Math.abs(data.comparison.geminiLength - data.comparison.deepgramLength)} characters`);
    console.log();
    console.log('Analysis:');
    console.log(wrapText(data.comparison.similarityNote, 76));
    console.log();

    console.log('━'.repeat(60));
    console.log('⏱️  PERFORMANCE METRICS');
    console.log('━'.repeat(60));
    console.log(`Video Size:         ${data.metadata.videoSizeMB.toFixed(2)} MB`);
    console.log(`Gemini Time:        ${data.gemini.processingTime}ms`);
    console.log(`Deepgram Time:      ${data.deepgram.processingTime}ms`);
    console.log(`Total Backend Time: ${data.metadata.totalProcessingTime}ms`);
    console.log(`Total Request Time: ${requestTime}ms`);
    console.log(`Timestamp:          ${data.metadata.timestamp}`);
    console.log('━'.repeat(60));
    console.log();

    // Show sample of timestamped words
    if (data.deepgram.words.length > 0) {
      console.log('⏰ SAMPLE TIMESTAMPED WORDS (first 10):');
      console.log('━'.repeat(60));
      data.deepgram.words.slice(0, 10).forEach((word, i) => {
        const startTime = word.start.toFixed(2);
        const endTime = word.end.toFixed(2);
        const confidence = (word.confidence * 100).toFixed(0);
        console.log(`${String(i + 1).padStart(2)}. [${startTime}s - ${endTime}s] "${word.word}" (${confidence}%)`);
      });
      console.log('━'.repeat(60));
      console.log();
    }

    // Save full response to file
    const fs = require('fs');
    const filename = `dual-transcribe-${data.instagram.postCode}-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`💾 Full response saved to: ${filename}`);
    console.log();

  } catch (error) {
    console.error('❌ Request failed:', error.message);
    process.exit(1);
  }
}

// Helper function to wrap text at specified width
function wrapText(text, width) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + word).length > width) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word + ' ';
    } else {
      currentLine += word + ' ';
    }
  }

  if (currentLine) lines.push(currentLine.trim());
  return lines.map(line => '  ' + line).join('\n');
}

// Main execution
const instagramUrl = process.argv[2];

if (!instagramUrl) {
  console.error('❌ Error: Instagram URL is required');
  console.error();
  console.error('Usage:');
  console.error('  node test-dual-transcribe.js <instagram-url>');
  console.error();
  console.error('Example:');
  console.error('  node test-dual-transcribe.js https://www.instagram.com/reel/ABC123/');
  process.exit(1);
}

testDualTranscribe(instagramUrl);
