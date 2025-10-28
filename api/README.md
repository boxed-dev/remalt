# YouTube Transcription API

Two methods for transcribing YouTube videos:

## 1️⃣ Native Transcript API (FREE, FAST) ✅
**Use this FIRST** - works for ~70% of videos with captions

```bash
python transcript_api.py
# Runs Flask server on port 5001
```

**API Endpoints:**
- `POST /api/transcribe` - `{ "url": "VIDEO_URL" }` → transcript
- `GET /health` - health check
- `POST /api/clear-cache` - clear cache

**Pros:** Free, instant, no bot issues
**Cons:** Only works if video has captions

---

## 2️⃣ Deepgram Audio Transcription (PAID, UNIVERSAL) 💰
**Use this** for videos WITHOUT captions

```bash
python youtube_deepgram_transcriber.py "https://youtube.com/watch?v=VIDEO_ID"
```

**Pros:** Works for ALL videos
**Cons:** Costs money, requires bot bypass setup, slower

---

## Quick Cloud Setup

### Step 1: Install Dependencies
```bash
pip install -r requirements.txt
pip install -U yt-dlp
apt-get install -y ffmpeg  # or: brew install ffmpeg
```

### Step 2: Configure Environment
Create `.env` file:
```bash
DEEPGRAM_API_KEY=your_key_here
COOKIES_FILE=cookies.txt  # Required for bot bypass
```

### Step 3: Export YouTube Cookies (CRITICAL for cloud)
1. Install browser extension: **"Get cookies.txt LOCALLY"**
2. Sign into YouTube in your browser
3. Click extension → Export → save as `cookies.txt`
4. Upload `cookies.txt` to server

**Cookies last ~6 months** - re-export when they expire.

### Step 4: Verify Setup
```bash
python setup_check.py
```

---

## Vercel Deployment (Native Transcript Only)

The native transcript API can deploy to Vercel serverless:

```bash
vercel --prod
```

**Note:** Deepgram transcriber requires yt-dlp/ffmpeg and cannot run on Vercel. Deploy to:
- VPS (AWS EC2, DigitalOcean, etc.)
- Docker container
- Railway, Render, Fly.io

---

## Full Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete cloud setup guide
  - Bot bypass methods (cookies, po_token, proxy)
  - Docker deployment
  - Troubleshooting
  - Production notes

---

## Cost Comparison

| Method | Cost | Speed | Coverage |
|--------|------|-------|----------|
| Native Transcript | $0 | Instant | ~70% of videos |
| Deepgram | ~$0.0125/min | ~1:1 ratio | 100% of videos |

**Recommendation:** Always try native transcript first, fallback to Deepgram only if needed.
