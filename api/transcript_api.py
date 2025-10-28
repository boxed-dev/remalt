
from http.server import BaseHTTPRequestHandler
import json
import re
import time
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    TranscriptsDisabled,
    NoTranscriptFound,
    VideoUnavailable,
    YouTubeRequestFailed,
    RequestBlocked
)
import os
import tempfile
from deepgram import DeepgramClient
import yt_dlp
from dotenv import load_dotenv

# Load .env at startup
load_dotenv()

# In-memory cache for transcripts (24 hour TTL)
transcript_cache = {}
CACHE_TTL = 24 * 60 * 60

RETRY_CONFIG = {
    'max_retries': 3,
    'initial_delay': 1.0,
    'max_delay': 10.0,
    'backoff_multiplier': 2.0,
}

def extract_video_id(url):
    patterns = [
        r'(?:youtube\\.com/watch\\?v=)([^&\n?#]+)',
        r'(?:youtu\\.be/)([^&\n?#]+)',
        r'(?:youtube\\.com/embed/)([^&\n?#]+)',
        r'(?:youtube\\.com/shorts/)([^&\n?#]+)',
        r'^([a-zA-Z0-9_-]{11})$',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def get_cached_transcript(video_id):
    if video_id in transcript_cache:
        cached_data = transcript_cache[video_id]
        age = time.time() - cached_data['timestamp']
        if age < CACHE_TTL:
            return cached_data['data']
    return None

def cache_transcript(video_id, data):
    transcript_cache[video_id] = {
        'data': data,
        'timestamp': time.time()
    }

def fetch_transcript_with_retry(video_id, max_retries=3):
    ytt_api = YouTubeTranscriptApi()
    last_exception = None
    for attempt in range(max_retries+1):
        try:
            transcript_list = ytt_api.list_transcripts(video_id)
            transcript = None
            try:
                transcript = transcript_list.find_transcript(['en', 'en-US', 'en-GB'])
            except:
                pass
            if not transcript:
                try:
                    manual_transcripts = [t for t in transcript_list if not t.is_generated]
                    if manual_transcripts:
                        transcript = manual_transcripts[0]
                except:
                    pass
            if not transcript:
                try:
                    available = list(transcript_list)
                    if available:
                        transcript = available[0]
                except:
                    pass
            if not transcript:
                raise NoTranscriptFound(video_id, [], {})
            transcript_data = transcript.fetch()
            full_text = ' '.join([snippet['text'] for snippet in transcript_data])
            return {
                'transcript': full_text,
                'language': transcript.language_code
            }
        except (RequestBlocked, YouTubeRequestFailed) as e:
            last_exception = e
            delay = min(RETRY_CONFIG['initial_delay'] * (RETRY_CONFIG['backoff_multiplier'] ** attempt), RETRY_CONFIG['max_delay'])
            time.sleep(delay)
        except (TranscriptsDisabled, NoTranscriptFound, VideoUnavailable) as e:
            raise e
        except Exception as e:
            last_exception = e
            break
    if last_exception:
        raise last_exception

class handler(BaseHTTPRequestHandler):
    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def _parse_request(self):
        length = int(self.headers.get('content-length', 0))
        if length == 0:
            return None
        body = self.rfile.read(length)
        try:
            return json.loads(body)
        except Exception:
            return None

    def _is_path(self, *paths):
        return self.path in paths

    def do_GET(self):
        # Support both root-mounted and prefixed routes
        if self._is_path('/', '/health', '/transcript_api', '/transcript_api/health', '/api/transcript_api', '/api/transcript_api/health'):
            self._send_json({
                'status': 'healthy',
                'cache_size': len(transcript_cache)
            })
        else:
            self._send_json({'error': 'Not found'}, status=404)

    def do_POST(self):
        # Transcribe endpoints
        if self._is_path('/', '/transcribe', '/transcript_api', '/transcript_api/transcribe', '/api/transcript_api', '/api/transcript_api/transcribe'):
            data = self._parse_request()
            if not data or 'url' not in data:
                self._send_json({'error': 'URL is required'}, status=400)
                return
            video_id = extract_video_id(data['url'])
            if not video_id:
                self._send_json({'error': 'Invalid YouTube URL'}, status=400)
                return
            cached = get_cached_transcript(video_id)
            if cached:
                result = {**cached, 'cached': True}
                self._send_json(result)
                return
            try:
                transcript_result = fetch_transcript_with_retry(video_id)
                result = {
                    'transcript': transcript_result['transcript'],
                    'language': transcript_result['language'],
                    'videoId': video_id,
                    'cached': False
                }
                cache_transcript(video_id, result)
                self._send_json(result)
            except (TranscriptsDisabled, NoTranscriptFound):
                self._send_json({'error': 'No captions available', 'error_type': 'NoTranscriptFound', 'videoId': video_id}, status=404)
            except VideoUnavailable as e:
                self._send_json({'error': 'Video unavailable', 'error_type': 'VideoUnavailable', 'details': str(e), 'videoId': video_id}, status=404)
            except (RequestBlocked, YouTubeRequestFailed) as e:
                self._send_json({'error': 'Rate limited or request failed', 'error_type': type(e).__name__, 'details': str(e), 'videoId': video_id}, status=429)
            except Exception as e:
                self._send_json({'error': 'Transcription failed', 'error_type': type(e).__name__, 'details': str(e), 'videoId': video_id}, status=500)
        # DUMMY DEEPGRAM-LIKE ENDPOINT (super minimal demo)
        elif self._is_path('/deepgram/transcribe'):
            data = self._parse_request()
            if not data or 'url' not in data:
                self._send_json({'error': 'URL is required'}, status=400)
                return
            url = data['url']
            DG_API_KEY = os.getenv('DEEPGRAM_API_KEY')
            if not DG_API_KEY:
                self._send_json({'error': 'Deepgram API key not set in .env'}, status=500)
                return
            try:
                with tempfile.TemporaryDirectory() as tmpdir:
                    out_tmpl = os.path.join(tmpdir, 'audio.%(ext)s')
                    ydl_opts = {
                        'format': 'bestaudio/best',
                        'outtmpl': out_tmpl,
                        'quiet': True,
                        'noplaylist': True,
                        'postprocessors': [
                            {
                                'key': 'FFmpegExtractAudio',
                                'preferredcodec': 'mp3',
                                'preferredquality': '192',
                            }
                        ],
                        'forceoverwrite': True
                    }
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        ydl.download([url])
                    mp3_path = out_tmpl.replace('%(ext)s', 'mp3')
                    client = DeepgramClient()
                    with open(mp3_path, 'rb') as f:
                        response = client.listen.prerecorded(
                            source={'buffer': f, 'mimetype': 'audio/mp3'},
                            options={'model': 'nova-2', 'smart_format': True},
                            api_key=DG_API_KEY
                        )
                    # Extract transcript if present, else return raw response
                    transcript = None
                    try:
                        transcript = response['results']['channels'][0]['alternatives'][0]['transcript']
                    except Exception:
                        try:
                            transcript = response.results.channels[0].alternatives[0].transcript
                        except Exception:
                            pass
                    if transcript:
                        self._send_json({'transcript': transcript, 'source_url': url})
                    else:
                        self._send_json({'source_url': url, 'deepgram_response': response})
            except Exception as e:
                self._send_json({'error': 'Deepgram transcription failed', 'details': str(e), 'source_url': url}, status=500)
        # Clear-cache endpoints
        elif self._is_path('/clear-cache', '/transcript_api/clear-cache', '/api/transcript_api/clear-cache'):
            size = len(transcript_cache)
            transcript_cache.clear()
            self._send_json({'message': f'Cache cleared ({size} entries removed)'})
        else:
            self._send_json({'error': 'Not found'}, status=404)