#!/bin/bash

API_URL="http://72.60.221.21:3001"

echo "🔍 Testing Instagram Transcription API"
echo "========================================"
echo ""

echo "1️⃣  Health Check..."
curl -s "$API_URL/health" | jq '.'
echo ""
echo ""

echo "2️⃣  Root Endpoint..."
curl -s "$API_URL/" | jq '.'
echo ""
echo ""

echo "📝 To test transcription, use:"
echo ""
echo "curl -X POST $API_URL/transcribe \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"url\": \"https://www.instagram.com/reel/YOUR_REEL_ID/\"}'"
echo ""
echo "✅ API is ready to use!"

