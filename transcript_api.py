
from flask import Flask, request, jsonify
from flask_cors import CORS
from youtube_transcript_api import YouTubeTranscriptApi
import re
import time

app = Flask(__name__)
CORS(app)  # Enable CORS for Next.js frontend

# In-memory cache for transcripts (24 hour TTL)
transcript_cache = {}
CACHE_TTL = 24 * 60 * 60  # 24 hours in seconds

def extract_video_id(url):
    """Extract YouTube video ID from various URL formats"""
    patterns = [
        r'(?:youtube\.com\/watch\?v=)([^&\n?#]+)',
        r'(?:youtu\.be\/)([^&\n?#]+)',
        r'(?:youtube\.com\/embed\/)([^&\n?#]+)',
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

@app.route('/api/transcribe', methods=['POST'])
def transcribe():
    """Transcribe YouTube video"""
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
        
        # Fetch transcript
        print(f"[Python API] Fetching transcript for video: {video_id}")
        
        try:
            # Use the YouTubeTranscriptApi instance method
            ytt_api = YouTubeTranscriptApi()
            transcript_data = ytt_api.fetch(video_id)
            
            print(f"[Python API] Successfully fetched transcript")
            
            # Extract snippets from FetchedTranscript object
            snippets = transcript_data.snippets
            
            # Combine all text from snippet objects
            full_text = ' '.join([snippet.text for snippet in snippets])
            
            elapsed = (time.time() - start_time) * 1000
            
            # Get language from FetchedTranscript object
            language = transcript_data.language_code if hasattr(transcript_data, 'language_code') else 'en'
            
            print(f"[Python API] ✅ Success - {len(full_text)} chars ({language})")
            print(f"[Result] ✅ Success via Python API ({elapsed:.0f}ms)\n")
            
            result = {
                'transcript': full_text,
                'method': 'python-api',
                'language': language,
                'videoId': video_id,
                'cached': False,
                'elapsed_ms': elapsed
            }
            
            # Cache the result
            cache_transcript(video_id, result)
            
            return jsonify(result)
            
        except Exception as e:
            elapsed = (time.time() - start_time) * 1000
            print(f"[Python API] ❌ Error: {str(e)}")
            print(f"[Result] ❌ Failed ({elapsed:.0f}ms)\n")
            return jsonify({
                'error': 'Transcription failed',
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
    print("\n" + "="*60)
    print("🚀 YouTube Transcript API Server")
    print("="*60)
    print("\nEndpoints:")
    print("  POST /api/transcribe - Transcribe YouTube video")
    print("  GET  /health - Health check")
    print("  POST /api/clear-cache - Clear transcript cache")
    print("\nExample usage:")
    print('  curl -X POST http://localhost:5000/api/transcribe \\')
    print('    -H "Content-Type: application/json" \\')
    print('    -d \'{"url": "WW42RFaduW4"}\'')
    print("\n" + "="*60 + "\n")
    
    # Run on port 5001 (different from Next.js dev server on 3000)
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5001
    app.run(host='0.0.0.0', port=port, debug=True)

