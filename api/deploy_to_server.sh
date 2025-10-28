#!/bin/bash
# Quick deployment script for YouTube Deepgram Transcriber
# Usage: ./deploy_to_server.sh root@srv1088832

if [ -z "$1" ]; then
    echo "Usage: $0 <user@host>"
    echo "Example: $0 root@srv1088832"
    exit 1
fi

SERVER=$1
REMOTE_DIR="/root/yt-api"

echo "🚀 Deploying to $SERVER..."

# Upload the fixed script
echo "📤 Uploading youtube_deepgram_transcriber.py..."
scp youtube_deepgram_transcriber.py "$SERVER:$REMOTE_DIR/main.py"

echo "📤 Uploading requirements.txt..."
scp ../requirements.txt "$SERVER:$REMOTE_DIR/requirements.txt"

# Run setup commands on server
echo "🔧 Running setup on server..."
ssh "$SERVER" << 'ENDSSH'
cd /root/yt-api
source .venv/bin/activate

# Update dependencies
pip install -U pip
pip install -U yt-dlp deepgram-sdk python-dotenv

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  ffmpeg not found. Installing..."
    apt-get update && apt-get install -y ffmpeg
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Export cookies.txt from your browser (see instructions)"
echo "2. Upload cookies.txt: scp cookies.txt $USER@$HOSTNAME:/root/yt-api/"
echo "3. Add to .env: echo 'COOKIES_FILE=cookies.txt' >> .env"
echo "4. Test: python main.py 'https://youtube.com/watch?v=VIDEO_ID'"
ENDSSH

echo ""
echo "✅ Done! Script deployed to $SERVER:$REMOTE_DIR/main.py"
echo ""
echo "📋 Next: Upload cookies.txt to bypass YouTube bot detection"
echo "   See: api/DEPLOYMENT.md for instructions"
