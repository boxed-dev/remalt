
from flask import Flask, request, jsonify
from flask_cors import CORS
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    TranscriptsDisabled,
    NoTranscriptFound,
    VideoUnavailable,
    YouTubeRequestFailed,
    RequestBlocked
)
import re
import time
from functools import wraps

app = Flask(__name__)
CORS(app)  # Enable CORS for Next.js frontend

# In-memory cache for transcripts (24 hour TTL)
transcript_cache = {}
CACHE_TTL = 24 * 60 * 60  # 24 hours in seconds

# Retry configuration
RETRY_CONFIG = {
    'max_retries': 3,
    'initial_delay': 1.0,
    'max_delay': 10.0,
    'backoff_multiplier': 2.0,
}

def retry_with_backoff(max_retries=None):
    """Decorator for retry logic with exponential backoff"""
    if max_retries is None:
        max_retries = RETRY_CONFIG['max_retries']

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None

            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except (RequestBlocked, YouTubeRequestFailed) as e:
                    last_exception = e

                    if attempt < max_retries:
                        delay = min(
                            RETRY_CONFIG['initial_delay'] * (RETRY_CONFIG['backoff_multiplier'] ** attempt),
                            RETRY_CONFIG['max_delay']
                        )
                        print(f"[Retry] Attempt {attempt + 1} failed: {str(e)}, retrying in {delay:.1f}s...")
                        time.sleep(delay)
                    else:
                        print(f"[Retry] All {max_retries} retries exhausted")
                        raise
                except (TranscriptsDisabled, NoTranscriptFound, VideoUnavailable) as e:
                    # These errors won't benefit from retries
                    print(f"[Error] Non-retryable error: {str(e)}")
                    raise

            raise last_exception or Exception("Retry failed")

        return wrapper
    return decorator

def extract_video_id(url):
    """Extract YouTube video ID from various URL formats"""
    patterns = [
        r'(?:youtube\.com\/watch\?v=)([^&\n?#]+)',
        r'(?:youtu\.be\/)([^&\n?#]+)',
        r'(?:youtube\.com\/embed\/)([^&\n?#]+)',
        r'(?:youtube\.com\/shorts\/)([^&\n?#]+)',  # Support YouTube Shorts
        r'^([a-zA-Z0-9_-]{11})$',
    ]

    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def get_cached_transcript(video_id):
    """Check if transcript is cached and still valid"""
    if video_id in transcript_cache:
        cached_data = transcript_cache[video_id]
        age = time.time() - cached_data['timestamp']
        if age < CACHE_TTL:
            return cached_data['data']
    return None

def cache_transcript(video_id, data):
    """Cache transcript data"""
    transcript_cache[video_id] = {
        'data': data,
        'timestamp': time.time()
    }

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'cache_size': len(transcript_cache)
    })

@retry_with_backoff(max_retries=3)
def fetch_transcript_with_retry(video_id):
    """Fetch transcript with retry logic - tries ANY available language"""
    ytt_api = YouTubeTranscriptApi()

    # Try to get list of available transcripts
    try:
        transcript_list = ytt_api.list_transcripts(video_id)

        # Priority order: English first, then any manually created, then any generated
        transcript = None

        # Try English first
        try:
            transcript = transcript_list.find_transcript(['en', 'en-US', 'en-GB'])
            print(f"[Python API] Found English transcript")
        except:
            pass

        # If no English, try any manually created transcript
        if not transcript:
            try:
                manual_transcripts = [t for t in transcript_list if not t.is_generated]
                if manual_transcripts:
                    transcript = manual_transcripts[0]
                    print(f"[Python API] Found manual transcript in {transcript.language_code}")
            except:
                pass

        # If still nothing, get ANY available transcript (including auto-generated)
        if not transcript:
            try:
                available = list(transcript_list)
                if available:
                    transcript = available[0]
                    print(f"[Python API] Found auto-generated transcript in {transcript.language_code}")
            except:
                pass

        if not transcript:
            raise NoTranscriptFound(video_id, [], {})

        # Fetch the actual transcript data
        transcript_data = transcript.fetch()

        # Combine all text
        full_text = ' '.join([snippet['text'] for snippet in transcript_data])

        return {
            'transcript': full_text,
            'language': transcript.language_code
        }

    except Exception as e:
        # Fallback to old method if new method fails
        print(f"[Python API] List method failed, trying direct fetch: {str(e)}")
        transcript_data = ytt_api.fetch(video_id)
        snippets = transcript_data.snippets
        full_text = ' '.join([snippet.text for snippet in snippets])
        language = transcript_data.language_code if hasattr(transcript_data, 'language_code') else 'en'

        return {
            'transcript': full_text,
            'language': language
        }

@app.route('/api/transcribe', methods=['POST'])
def transcribe():
    """Transcribe YouTube video with robust error handling"""
    start_time = time.time()

    try:
        data = request.get_json()

        if not data or 'url' not in data:
            return jsonify({'error': 'URL is required'}), 400

        video_id = extract_video_id(data['url'])
        if not video_id:
            return jsonify({'error': 'Invalid YouTube URL'}), 400

        print(f"\n=== Transcription Request for {video_id} ===")

        # Check cache first
        cached = get_cached_transcript(video_id)
        if cached:
            elapsed = (time.time() - start_time) * 1000
            print(f"[Cache] ✅ Returning cached transcript ({len(cached['transcript'])} chars)")
            print(f"[Result] ✅ Success via Cache ({elapsed:.0f}ms)\n")
            return jsonify({
                **cached,
                'cached': True,
                'elapsed_ms': elapsed
            })

        # Fetch transcript with retry logic
        print(f"[Python API] Fetching transcript for video: {video_id}")

        try:
            transcript_result = fetch_transcript_with_retry(video_id)

            elapsed = (time.time() - start_time) * 1000

            print(f"[Python API] ✅ Success - {len(transcript_result['transcript'])} chars ({transcript_result['language']})")
            print(f"[Result] ✅ Success via Python API ({elapsed:.0f}ms)\n")

            result = {
                'transcript': transcript_result['transcript'],
                'method': 'python-api',
                'language': transcript_result['language'],
                'videoId': video_id,
                'cached': False,
                'elapsed_ms': elapsed
            }

            # Cache the result
            cache_transcript(video_id, result)

            return jsonify(result)

        except (TranscriptsDisabled, NoTranscriptFound) as e:
            elapsed = (time.time() - start_time) * 1000
            error_type = type(e).__name__
            print(f"[Python API] ❌ {error_type}: {str(e)}")
            print(f"[Result] ❌ No captions available ({elapsed:.0f}ms)\n")

            return jsonify({
                'error': 'No captions available',
                'error_type': error_type,
                'details': str(e),
                'videoId': video_id
            }), 404

        except VideoUnavailable as e:
            elapsed = (time.time() - start_time) * 1000
            print(f"[Python API] ❌ Video unavailable: {str(e)}")
            print(f"[Result] ❌ Video unavailable ({elapsed:.0f}ms)\n")

            return jsonify({
                'error': 'Video unavailable',
                'error_type': 'VideoUnavailable',
                'details': str(e),
                'videoId': video_id
            }), 404

        except (RequestBlocked, YouTubeRequestFailed) as e:
            elapsed = (time.time() - start_time) * 1000
            error_type = type(e).__name__
            print(f"[Python API] ❌ {error_type} after retries: {str(e)}")
            print(f"[Result] ❌ Failed after retries ({elapsed:.0f}ms)\n")

            return jsonify({
                'error': 'Rate limited or request failed',
                'error_type': error_type,
                'details': str(e),
                'videoId': video_id
            }), 429

        except Exception as e:
            elapsed = (time.time() - start_time) * 1000
            print(f"[Python API] ❌ Unexpected error: {str(e)}")
            print(f"[Result] ❌ Failed ({elapsed:.0f}ms)\n")

            return jsonify({
                'error': 'Transcription failed',
                'error_type': type(e).__name__,
                'details': str(e),
                'videoId': video_id
            }), 500

    except Exception as e:
        return jsonify({
            'error': str(e),
            'details': 'Server error'
        }), 500

@app.route('/api/clear-cache', methods=['POST'])
def clear_cache():
    """Clear transcript cache"""
    size = len(transcript_cache)
    transcript_cache.clear()
    return jsonify({
        'message': f'Cache cleared ({size} entries removed)'
    })

if __name__ == '__main__':
    import os

    # Get port from Railway's environment variable or default to 5001
    port = int(os.environ.get('PORT', 5001))

    # Production mode (debug=False) when RAILWAY_ENVIRONMENT exists
    is_production = 'RAILWAY_ENVIRONMENT' in os.environ

    if not is_production:
        print("\n" + "="*60)
        print("🚀 YouTube Transcript API Server")
        print("="*60)
        print("\nEndpoints:")
        print("  POST /api/transcribe - Transcribe YouTube video")
        print("  GET  /health - Health check")
        print("  POST /api/clear-cache - Clear transcript cache")
        print("\nExample usage:")
        print('  curl -X POST http://localhost:5001/api/transcribe \\')
        print('    -H "Content-Type: application/json" \\')
        print('    -d \'{"url": "WW42RFaduW4"}\'')
        print("\n" + "="*60 + "\n")

    app.run(host='0.0.0.0', port=port, debug=not is_production)

