# Instagram Transcription API

Minimal Instagram transcription API using Apify + Deepgram with multilingual support.

## Deployment

The API is deployed at: `http://72.60.221.21:3001`

## Endpoints

### Health Check
```bash
curl http://72.60.221.21:3001/health
```

### Transcribe Instagram Video
```bash
curl -X POST http://72.60.221.21:3001/transcribe \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.instagram.com/reel/ABC123/"}'
```

### Transcribe with Specific Language
```bash
curl -X POST http://72.60.221.21:3001/transcribe \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.instagram.com/reel/ABC123/",
    "language": "es"
  }'
```

## Features

- ✅ **Multilingual**: Automatic language detection (36+ languages via Deepgram)
- ✅ **Fast**: Parallel video download and transcription
- ✅ **Minimal**: Single-file API with zero complexity
- ✅ **Reliable**: Health checks and proper error handling

## Supported Languages

Deepgram automatically detects:
- English, Spanish, French, German, Italian, Portuguese
- Chinese, Japanese, Korean, Hindi, Arabic
- And 25+ more languages

## Response Format

```json
{
  "success": true,
  "post_code": "ABC123",
  "author": "username",
  "caption": "Check this out!",
  "transcript": "Hello everyone, welcome to...",
  "confidence": 0.95,
  "language_detected": "en",
  "video_size_mb": 5.2,
  "processing_time_ms": 3500,
  "timestamp": "2025-11-05T12:00:00Z"
}
```

## Local Development

```bash
cd instagram-api
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set environment variables
export APIFY_API_TOKEN="your_token"
export DEEPGRAM_API_KEY="your_key"

# Run
python main.py
```

## Docker Deployment

```bash
# Build and run
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Tech Stack

- **FastAPI**: Modern Python web framework
- **Apify**: Instagram post scraper
- **Deepgram**: Speech-to-text with multilingual support
- **Docker**: Containerized deployment

