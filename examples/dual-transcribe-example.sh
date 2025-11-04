#!/bin/bash

# Instagram Dual Transcribe API - Example Usage
# This script demonstrates how to use the dual transcription endpoint

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Instagram Dual Transcribe API - Test Examples"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Configuration
API_URL="http://localhost:3000/api/instagram/dual-transcribe"
INSTAGRAM_URL="${1:-https://www.instagram.com/reel/ABC123/}"

echo "📝 Configuration:"
echo "   API URL: $API_URL"
echo "   Instagram URL: $INSTAGRAM_URL"
echo ""

# Example 1: Basic Request
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Example 1: Basic Request"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Command:"
echo "curl -X POST $API_URL \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"url\": \"$INSTAGRAM_URL\"}'"
echo ""
echo "⏳ Sending request..."
echo ""

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$INSTAGRAM_URL\"}" \
  -w "\n\n⏱️  Response Time: %{time_total}s\n" \
  -s

echo ""
echo ""

# Example 2: Pretty Print with jq
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Example 2: Pretty Print with jq (if installed)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if command -v jq &> /dev/null; then
  echo "Command:"
  echo "curl -s -X POST $API_URL \\"
  echo "  -H \"Content-Type: application/json\" \\"
  echo "  -d '{\"url\": \"$INSTAGRAM_URL\"}' | jq '.'"
  echo ""
  echo "⏳ Sending request..."
  echo ""

  curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"$INSTAGRAM_URL\"}" | jq '.'
else
  echo "⚠️  jq not installed. Skipping this example."
  echo "   Install jq: https://stedolan.github.io/jq/download/"
fi

echo ""
echo ""

# Example 3: Extract Only Transcripts
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Example 3: Extract Only Transcripts (with jq)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if command -v jq &> /dev/null; then
  echo "Command to get Gemini transcript:"
  echo "curl -s ... | jq -r '.gemini.transcript'"
  echo ""
  echo "Command to get Deepgram transcript:"
  echo "curl -s ... | jq -r '.deepgram.transcript'"
  echo ""
  echo "Command to get comparison:"
  echo "curl -s ... | jq '.comparison'"
  echo ""

  echo "⏳ Fetching just the comparison data..."
  echo ""

  curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"$INSTAGRAM_URL\"}" | jq '.comparison'
else
  echo "⚠️  jq not installed. Skipping this example."
fi

echo ""
echo ""

# Example 4: Save to File
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Example 4: Save Response to File"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

OUTPUT_FILE="dual-transcribe-response-$(date +%s).json"
echo "Command:"
echo "curl -s -X POST $API_URL \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"url\": \"$INSTAGRAM_URL\"}' > $OUTPUT_FILE"
echo ""
echo "⏳ Saving response to $OUTPUT_FILE..."
echo ""

curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$INSTAGRAM_URL\"}" > "$OUTPUT_FILE"

if [ -f "$OUTPUT_FILE" ]; then
  FILE_SIZE=$(wc -c < "$OUTPUT_FILE")
  echo "✅ Response saved to: $OUTPUT_FILE"
  echo "   File size: $FILE_SIZE bytes"

  if command -v jq &> /dev/null; then
    echo ""
    echo "Preview (first 500 chars):"
    jq -r '.gemini.transcript' "$OUTPUT_FILE" 2>/dev/null | head -c 500
    echo "..."
  fi
else
  echo "❌ Failed to save response"
fi

echo ""
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Examples Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Tips:"
echo "   • Use Node.js test script for better formatting:"
echo "     node test-dual-transcribe.js $INSTAGRAM_URL"
echo ""
echo "   • Extract specific fields with jq:"
echo "     jq '.gemini.summary' $OUTPUT_FILE"
echo "     jq '.deepgram.confidence' $OUTPUT_FILE"
echo "     jq '.comparison.similarityNote' $OUTPUT_FILE"
echo ""
echo "   • Get word timestamps from Deepgram:"
echo "     jq '.deepgram.words[] | {word, start, end, confidence}' $OUTPUT_FILE"
echo ""
