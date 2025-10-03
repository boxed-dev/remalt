# YouTube Transcription - Usage Examples

## Quick Test

You can test the transcription system using curl or any HTTP client:

### Example 1: Video with Captions (Fast - 1-2s)

```bash
curl -X POST http://localhost:3000/api/transcribe \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=WW42RFaduW4"}'
```

**Response:**
```json
{
  "transcript": "Full transcript text here...",
  "method": "youtube",
  "language": "en",
  "videoId": "WW42RFaduW4",
  "cached": false
}
```

### Example 2: Using Video ID Only

```bash
curl -X POST http://localhost:3000/api/transcribe \
  -H "Content-Type: application/json" \
  -d '{"url": "WW42RFaduW4"}'
```

### Example 3: Short URL Format

```bash
curl -X POST http://localhost:3000/api/transcribe \
  -H "Content-Type: application/json" \
  -d '{"url": "https://youtu.be/WW42RFaduW4"}'
```

### Example 4: Second Request (Cached - < 10ms)

```bash
# Same request returns instantly from cache
curl -X POST http://localhost:3000/api/transcribe \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=WW42RFaduW4"}'
```

**Response:**
```json
{
  "transcript": "Full transcript text here...",
  "method": "cache",
  "videoId": "WW42RFaduW4",
  "cached": true
}
```

## Using in Your Code

### Client-side (React/TypeScript)

```typescript
const transcribeVideo = async (url: string) => {
  try {
    const response = await fetch('/api/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Transcription failed');
    }

    const result = await response.json();
    console.log('Transcript:', result.transcript);
    console.log('Method:', result.method); // 'cache', 'youtube', or 'deepgram'
    console.log('Cached:', result.cached);
    
    return result;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

// Usage
const result = await transcribeVideo('https://www.youtube.com/watch?v=WW42RFaduW4');
```

### Node.js (Direct Library Usage)

```typescript
import { YoutubeTranscript } from 'youtube-transcript';

const getTranscript = async (videoId: string) => {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const fullText = transcript.map(item => item.text).join(' ');
    
    console.log('Transcript length:', fullText.length);
    console.log('Transcript:', fullText);
    
    return fullText;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

// Usage
const text = await getTranscript('WW42RFaduW4');
```

## Testing Different Scenarios

### 1. Popular TED Talk (Has captions)
```bash
curl -X POST http://localhost:3000/api/transcribe \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=UF8uR6Z6KLc"}'
```

### 2. Educational Video (Usually has captions)
```bash
curl -X POST http://localhost:3000/api/transcribe \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

### 3. Music Video (May not have captions - falls back to Deepgram)
```bash
curl -X POST http://localhost:3000/api/transcribe \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=VIDEO_ID"}'
```

## Error Handling Examples

### Invalid URL
```bash
curl -X POST http://localhost:3000/api/transcribe \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/video"}'
```

**Response (400):**
```json
{
  "error": "Invalid YouTube URL"
}
```

### Missing URL
```bash
curl -X POST http://localhost:3000/api/transcribe \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response (400):**
```json
{
  "error": "URL is required"
}
```

### Video with no transcript available
```bash
curl -X POST http://localhost:3000/api/transcribe \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=PRIVATE_VIDEO"}'
```

**Response (500):**
```json
{
  "error": "Transcription failed",
  "details": "Unable to extract transcript using YouTube captions or Deepgram audio transcription.",
  "videoId": "PRIVATE_VIDEO"
}
```

## Performance Comparison

| Scenario | First Request | Second Request (Cached) |
|----------|--------------|------------------------|
| Video with captions | ~1-2 seconds | < 10ms |
| Video without captions | ~10-30 seconds | < 10ms |
| Invalid URL | < 50ms | < 10ms |

## Integration with Workflow

The YouTube node in the workflow automatically:
1. Shows loading state while transcribing
2. Displays success with method indicator (📝 Captions or 🎙️ Deepgram)
3. Shows character count for transcript
4. Caches at component level to prevent duplicate API calls
5. Passes transcript to connected Chat nodes for AI context

## Debug Logging

The API logs detailed information for debugging:

```
=== Transcription Request for WW42RFaduW4 ===
[YouTube Transcript] Fetching for video: WW42RFaduW4
[YouTube Transcript] ✅ Success - 12543 chars (en)
[Cache] Stored transcript for WW42RFaduW4
[Result] ✅ Success via YouTube Captions (en)
```

## Common Use Cases

1. **Educational Content Analysis** - Extract lecture transcripts for study materials
2. **Content Research** - Analyze video content without watching
3. **Accessibility** - Generate text from videos for hearing-impaired users
4. **AI Context** - Feed video transcripts to AI for question answering
5. **SEO & Indexing** - Extract text content from videos for search

## Tips for Best Results

- ✅ Use videos with closed captions (CC) for fastest results
- ✅ Popular channels usually have good auto-generated captions
- ✅ TED Talks, educational content, and news videos work great
- ⚠️ Music videos and vlogs may not have captions
- ⚠️ Private/unlisted videos may fail
- ⚠️ Very long videos (>2 hours) may take longer with Deepgram

