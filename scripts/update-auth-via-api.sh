#!/bin/bash

# You need to get a personal access token from:
# https://supabase.com/dashboard/account/tokens

# Then set it as an environment variable:
# export SUPABASE_ACCESS_TOKEN="your-token-here"

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "❌ Error: SUPABASE_ACCESS_TOKEN environment variable not set"
  echo ""
  echo "To get a token:"
  echo "1. Go to https://supabase.com/dashboard/account/tokens"
  echo "2. Generate a new token"
  echo "3. Run: export SUPABASE_ACCESS_TOKEN='your-token-here'"
  exit 1
fi

PROJECT_REF="enohvkozrazgjpbmnkgr"

echo "🔧 Updating Auth Configuration via Management API..."

curl -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "SITE_URL": "https://remalt.vercel.app",
    "URI_ALLOW_LIST": "http://localhost:3000/**,http://127.0.0.1:3000/**,https://remalt.vercel.app/**,https://remalt.vercel.app/auth/callback,https://remalt-*.vercel.app/**"
  }'

echo ""
echo "✅ Configuration update requested!"
